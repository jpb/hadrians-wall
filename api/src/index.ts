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

function subscribe(connectionId: string, s3ObjectPath: string) {
  const params = {
    TableName: CONNECTIONS_TABLE_NAME,
    Item: {
      connectionId: { S: connectionId },
      s3ObjectPath: { S: s3ObjectPath },
    }
  }

  return DB.putItem(params).promise()
    .then(() => {
      return {
        statusCode: 200,
        body: `Subscribed to ${s3ObjectPath}`
      };
    }, (err) => {
      return {
        statusCode: 500,
        body: JSON.stringify(err)
      };
    });
}

function disconnect(connectionId: string) {
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
        return {
          statusCode: 200,
          body: 'Disconnected'
        }
      }, (err) => {
        return {
          statusCode: 500,
          body: JSON.stringify(err)
        }
      });
    }, (err) => {
      return {
        statusCode: 500,
        body: JSON.stringify(err)
      };
    });
}

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  const {connectionId} = event.requestContext;
  let body;

  try {
    body = JSON.parse(event.body)
    if (typeof body !== 'object') {
      throw new Error('body is not an object');
    }
  } catch (e) {
    console.log('Failed to JSON decode body:', e);
    body = {};
  }

  switch (event.requestContext.routeKey) {
    case '$connect':
      return {
        statusCode: 200,
        body: 'Connected'
      }
    case '$disconnect':
      return disconnect(connectionId);
    case 'subscribe':
      const {s3ObjectPath} = body;
      if (typeof s3ObjectPath === 'string') {
        return subscribe(connectionId, s3ObjectPath);
      } else {
        return {
          statusCode: 500,
          body: 'Missing property `s3ObjectPath`'
        }
      }
    default:
      const {action} = body;
      return {
        statusCode: 500,
        body: `Unknown routeKey: ${event.requestContext.routeKey} action: ${action}`
      }
  }

}
