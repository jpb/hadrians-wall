import * as AWS from 'aws-sdk';
import * as AGMAPI from 'aws-sdk/clients/apigatewaymanagementapi';

import { EventBody } from './types';
import configureAWS from './configureAWS';

const DB = new AWS.DynamoDB({ apiVersion: '2012-10-08' });
const CONNECTIONS_TABLE_NAME = process.env.CONNECTIONS_TABLE_NAME;

type LambdaEventRecord = {
  s3: {
    bucket: {
      name: string
    },
    object: {
      key: string
    }
  }
}

type LambdaEvent = {
  Records: LambdaEventRecord[]
}

// From https://gist.github.com/gordonbrander/2230317
function id() {
  return Math.random().toString(36).substr(2, 9);
}

function isString(o: any) {
  return typeof o === 'object' && 'S' in o
}

export async function handler(event: LambdaEvent): Promise<any> {
  await configureAWS();
  return Promise.all(event.Records.map(({s3}) => {
    const key = s3.object.key;

    const params = {
      TableName: CONNECTIONS_TABLE_NAME,
      KeyConditionExpression: 's3ObjectPath = :s3ObjectPath',
      ProjectionExpression: 's3ObjectPath, connectionId, domainName, stage',
      ExpressionAttributeValues: {
        ':s3ObjectPath': { S: key }
      },
    };
    console.log(`Fetching connections for ${key}`);

    return DB.query(params).promise()
      .then((result) => {
        console.log(result)
        return Promise.all(result.Items.map((item) => {
          if (isString(item.domainName)
              && isString(item.stage)
              && isString(item.s3ObjectPath)
              && isString(item.connectionId)) {
            const endpoint = item.domainName.S + '/' + item.stage.S;
            const api = new AWS.ApiGatewayManagementApi({
              apiVersion: '2018-11-29',
              endpoint
            });
            console.log(`Notifying ${item.connectionId.S}@${endpoint} for ${item.s3ObjectPath.S}`)
            const event: EventBody = {
              id: id(),
              kind: 'notification',
              data: item.s3ObjectPath.S
            };
            return api.postToConnection({
              ConnectionId: item.connectionId.S,
              Data: JSON.stringify(event)
            }).promise();
          } else {
            console.error(`Missing data ${JSON.stringify(item)}`);
          }
        }));
      }, (err) => {
        console.error(err);
        return JSON.stringify(err);
      });
  }));
}
