$AppPort = 5005
$NetFirewallHyperVName = '{40E0AC32-46A5-438A-A0B2-2B479E8F2E90}'

Get-NetFirewallHyperVVMCreator 
Get-NetFirewallHyperVVMSetting -PolicyStore ActiveStore -Name $NetFirewallHyperVName
Get-NetFirewallHyperVRule -VMCreatorId $NetFirewallHyperVName
New-NetFirewallHyperVRule -Name Altinn3App -DisplayName "Altinn 3 Application" -Direction Inbound -VMCreatorId $NetFirewallHyperVName -Protocol TCP -LocalPorts $AppPort