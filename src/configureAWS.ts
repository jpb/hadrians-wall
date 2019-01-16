import * as AWS from 'aws-sdk';

export default async function() {
  const chain = new AWS.CredentialProviderChain();
  AWS.config.update({
    region: global.process.env.AWS_REGION,
    credentials: await chain.resolvePromise(),
  });
}
