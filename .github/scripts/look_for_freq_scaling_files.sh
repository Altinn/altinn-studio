#!/bin/bash
# Check if the required files exist
FREQ_PATH="/sys/devices/system/cpu/cpu0/cpufreq"
REQUIRED_FILES=("scaling_cur_freq" "scaling_max_freq")

# Create the directory structure if it doesn't exist
if [[ ! -d "$FREQ_PATH" ]]; then
    echo "Directory $FREQ_PATH not found, creating it."
    sudo mkdir -p "$FREQ_PATH"
    echo "Directory created: $FREQ_PATH"
fi

# Loop through each file and create a stub if it's missing
for FILE in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$FREQ_PATH/$FILE" ]]; then
        echo "File $FILE not found, creating a stub."
        sudo touch "$FREQ_PATH/$FILE"
        # Add some default content to make it readable
        echo "1000000" | sudo tee "$FREQ_PATH/$FILE" > /dev/null
        echo "Stub created for $FILE with default value."
    else
        echo "$FILE exists."
    fi
done
# End of script
