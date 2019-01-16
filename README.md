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

## Test

Run test script, providing `BUCKET`, `API_NAME`, and `API_STAGE`:

```
BUCKET=hadrians-wall-bucket-... \
API_NAME=... \
API_STAGE=... \
nodejs test.js
```

Output should look something like:

```
Sending {"id":"v7qtqfn7r","kind":"subscribe","data":"ssl2kd1gd"}
Received {"id":"v7qtqfn7r","kind":"subscribe","data":"ssl2kd1gd"}
Updating s3://hadrians-wall-bucket-1a5kcj93dxonc/ssl2kd1gd
Updated s3://hadrians-wall-bucket-1a5kcj93dxonc/ssl2kd1gd
Received {"id":"uk4uxvpxs","kind":"notification","data":"ssl2kd1gd"}
```
