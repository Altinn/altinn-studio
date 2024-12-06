#!/bin/bash

# Set the path to the solution file
solution_file="Designer.sln"

# Get a list of subfolders (directories only) in the specified path
subfolders=($(ls -d ls -d tests/Designer.Tests/Controllers/*/ ))

# Initialize an empty string to store concatenated commands
all_commands=""

final_conditions=""

# Iterate over each subfolder
for subfolder in "${subfolders[@]}"; do
    # Extract the subfolder name without the trailing slash
    subfolder_name=$(basename "$subfolder")
    # Concatenate the command
    all_commands+="dotnet test $solution_file --filter FullyQualifiedName~$subfolder_name --no-build; "
    # Add final condition that will run all tests that are not covered with subfolder filters
    final_conditions+="(FullyQualifiedName!~$subfolder_name)&"
done
# Remove the trailing '&' from final_conditions
final_conditions=${final_conditions%"&"}

# Construct the final filter string
final_filter="\"($final_conditions)\""

# Construct the final filter string
all_commands+="dotnet test $solution_file --filter $final_filter --no-build; "

# Execute all the concatenated commands
eval "$all_commands"

