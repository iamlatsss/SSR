@echo off
echo Starting AWS SSM Database Tunnel on port 3307...
aws ssm start-session --target i-08736e4d6c52c0095 --region us-east-1 --document-name AWS-StartPortForwardingSessionToRemoteHost --parameters "host=ssr-db.c63wkcss2qiz.us-east-1.rds.amazonaws.com,portNumber=3306,localPortNumber=3307" --profile ssr-project
pause
