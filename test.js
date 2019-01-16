const WebSocket = require('ws');
const AWS = require('aws-sdk');

const bucket = process.env.BUCKET;
const name = process.env.API_NAME;
const stage = process.env.API_STAGE;
const ws = new WebSocket(`wss://${name}.execute-api.us-east-1.amazonaws.com/${stage}`);

const s3 = new AWS.S3();

// From https://gist.github.com/gordonbrander/2230317
function id() {
  return Math.random().toString(36).substr(2, 9);
}

const path = id();

ws.on('message', (message) => {
  console.log(`Received ${message}`);
  const data = JSON.parse(message);
  if(data.kind === "subscribe") {
    console.log(`Updating s3://${bucket}/${path}`);
    s3.putObject({
      Bucket: bucket,
      Key: path,
      Body: ''
    }, (err, data) => {
      if (err) {
        console.error(err);
      } else {
        console.log(`Updated s3://${bucket}/${path}`);
      }
    });
  } else if(data.kind === "notification") {
    ws.terminate();
  }
});

ws.on('open', () => {
  const message = JSON.stringify({
    id: id(),
    kind: "subscribe",
    data: path
  });
  console.log(`Sending ${message}`);
  ws.send(message);
});
