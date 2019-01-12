import * as AWS from 'aws-sdk';

const DB = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
const CONNECTIONS_TABLE_NAME = global.process.env.CONNECTIONS_TABLE_NAME;

type LambdaEvent ={
  requestContext: {
    routeKey: string,
    connectionId: string
  },
  body: string
}

type LambdaResponse = {
  statusCode: number;
  body: string;
}

type Body = {
  id: string,
  kind: string,
  data: string
}

type ResponseFn = (statusCode: number, data: string) => LambdaResponse;

function subscribe(connectionId: string, s3ObjectPath: string, response: ResponseFn) {
  const params = {
    TableName: CONNECTIONS_TABLE_NAME,
    Item: {
      connectionId: { S: connectionId },
      s3ObjectPath: { S: s3ObjectPath },
    }
  }

  return DB.putItem(params).promise()
    .then(() => {
      return response(200, `Subscribed to ${s3ObjectPath}`);
    }, (err) => {
      return response(500, err.message);
    });
}

function disconnect(connectionId: string, response: ResponseFn) {
  var params = {
    ExpressionAttributeValues: {
      ":connectionId": {
        S: connectionId
      }
    },
    FilterExpression: "connectionId = :connectionId",
    ProjectionExpression: "connectionId, s3ObjectPath",
    TableName: CONNECTIONS_TABLE_NAME
  };

  return DB.scan(params).promise()
    .then((result) => {
      return Promise.all(result.Items.map((item) => {
        const params = {
          Key: {
            connectionId: {
              S: item.connectionId.S
            },
            s3ObjectPath: {
              S: item.s3ObjectPath.S
            }
          },
          TableName: CONNECTIONS_TABLE_NAME
        };
        return DB.deleteItem(params).promise();
      })).then(() => {
        return response(200, 'Disconnected');
      }, (err) => {
        return response(500, err.message);
      });
    }, (err) => {
      return response(500, err.message);
    });
}

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  const {connectionId} = event.requestContext;
  let body: Partial<Body>;

  try {
    body = JSON.parse(event.body)
    if (typeof body !== 'object') {
      throw new Error('body is not an object');
    }
  } catch (e) {
    console.log('Failed to JSON decode body:', e);
    body = {};
  }

  const response = (statusCode: number, data: string) => {
    return {
      statusCode,
      body: JSON.stringify({
        id: body.id,
        kind: statusCode === 200 ? 'response' : 'error',
        data,
      })
    }
  }

  switch (event.requestContext.routeKey) {
    case '$connect':
      return response(200, 'Connected');
    case '$disconnect':
      return disconnect(connectionId, response);
    case 'subscribe':
      if (typeof body.data === 'string') {
        return subscribe(connectionId, body.data, response);
      } else {
        return response(500, 'Missing string property `data`');
      }
    default:
      const {kind} = body;
      return response(500, `Unknown routeKey: ${event.requestContext.routeKey} kind: ${kind}`);
  }

}
