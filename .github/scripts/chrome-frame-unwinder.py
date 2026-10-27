"""Recover native Chrome callers when stripped functions lack unwind metadata."""

import re

import gdb
import gdb.unwinder


class FrameId:
    def __init__(self, stack_pointer, program_counter):
        self.sp = stack_pointer
        self.pc = program_counter


class ChromeFramePointer(gdb.unwinder.Unwinder):
    def __init__(self, text_start, text_end):
        super().__init__("chrome-frame-pointer")
        self.text_start = text_start
        self.text_end = text_end
        self.word_pointer = gdb.lookup_type("unsigned long long").pointer()

    def __call__(self, frame):
        try:
            program_counter = frame.read_register("rip")
            if not self.text_start <= int(program_counter) < self.text_end:
                return None
            frame_pointer = frame.read_register("rbp")
            stack_pointer = frame.read_register("rsp")
            # Reject unreadable or implausible chains instead of inventing callers.
            if not 0 <= int(frame_pointer) - int(stack_pointer) <= 1024 * 1024:
                return None
            if int(frame_pointer) % 8:
                return None
            saved = frame_pointer.cast(self.word_pointer)
            caller_frame_pointer = saved.dereference()
            caller_program_counter = (saved + 1).dereference()
            caller_address = int(caller_program_counter)
            if not (
                self.text_start <= caller_address < self.text_end
                or gdb.solib_name(caller_address)
            ):
                return None
            if not 0 < int(caller_frame_pointer) - int(frame_pointer) <= 8 * 1024 * 1024:
                return None
            result = frame.create_unwind_info(FrameId(frame_pointer + 16, program_counter))
            result.add_saved_register("rip", caller_program_counter)
            result.add_saved_register("rbp", caller_frame_pointer)
            result.add_saved_register("rsp", frame_pointer + 16)
            return result
        except (gdb.error, ValueError):
            return None


if gdb.selected_frame().architecture().name() == "i386:x86-64":
    # Only override native functions in the main executable, leaving shared
    # libraries and generated JavaScript code to GDB's existing unwinders.
    text = re.search(
        r"^\s*(0x[0-9a-f]+)\s*-\s*(0x[0-9a-f]+) is \.text$",
        gdb.execute("info files", to_string=True),
        re.MULTILINE,
    )
    if text:
        gdb.unwinder.register_unwinder(
            None,
            ChromeFramePointer(int(text[1], 16), int(text[2], 16)),
            replace=True,
        )
        print("Chrome frame-pointer unwinding enabled")
