# Hadrian's Wall 🏰

Subscribe to S3 object updates via a websocket connection.

## Deploy

Create CloudFormation stack via [iidy](https://github.com/unbounce/iidy):

```
iidy create-stack stack-args.yaml
```

or via AWS CLI:

```
aws cloudformation update-stack \
  --stack-name hadrians-wall \
  --template-body file://$(pwd)/cfn-template.yaml \
  --capabilities CAPABILITY_IAM
```

Build Lambda function code:

```
npm install
npm run build
```

Deploy Lambda function code:

```
aws lambda update-function-code \
  --function-name hadrians-wall-api \
  --zip-file fileb://$(pwd)/build.zip

aws lambda update-function-code \
  --function-name hadrians-wall-s3 \
  --zip-file fileb://$(pwd)/build.zip
```
