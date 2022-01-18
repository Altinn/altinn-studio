ALTER FUNCTION delegation.get_all_current_changes
	STABLE PARALLEL SAFE;

ALTER FUNCTION delegation.get_all_changes
	STABLE PARALLEL SAFE;

ALTER FUNCTION delegation.get_current_change
	STABLE PARALLEL SAFE
	ROWS 1; -- This function always return a single row, so hint this to the optimizer
