# Create resources in Azure

## Requirements

- Azure CLI 2.0 installed
- Azure CLI configured to the subscription you would like to use

## Setting the subscription

If you're not allready logged in, in the cli

- Run command `az login`

When that is done, we're going to set our subscription

- To list the subscriptions you have on your account, run command `az account list --output table`
- To use a specific subscription, run command `az account set --subscription [subscription name / subscription id]`

## Setting up resources

(IMPORTANT NOTE: The script must be run in Powershell, either by running it from a Powershell client, or right-click on the script and click "Run in powershell")

Run the script as admin, and it will walk you through creating all the needed resources.