const axios = require('axios');
const AWS = require('aws-sdk');
const Redis = require("ioredis");
const FunctionShield = require('@puresec/function-shield');
const logger = require('pino')();

const ENV = process.env;
const slackInfraAlertBot = ENV.slack_infra_alert_bot;
const redis_url = ENV.redis_url;
const redisConn = new Redis(6379, redis_url);
const nameChannel = ENV.name_channel;

FunctionShield.configure(
    {
        policy: {
            read_write_tmp: 'alert',
            create_child_process: 'alert',
            outbound_connectivity: 'alert',
            read_handler: 'alert'
        },
        disable_analytics: false,
        token: ENV.function_shield_token
    });

exports.handler = async (event, context) => {
    context.callbackWaitsForEmptyEventLoop = false;

    const dataJSON = JSON.parse(JSON.stringify(event));
    const stageObj = await getStageSlack();
    const nameCluster = dataJSON.detail.clusterArn.split('/')[1];
    const nameTask = dataJSON.detail.group.split(':')[1];
    const stopCode = dataJSON.detail.stopCode || '';
    const reasonStopCode = dataJSON.detail.stoppedReason || '';
    const lastStatus = dataJSON.detail.lastStatus;
    const starter = dataJSON.detail.startedBy || '';
    const severity = lastStatus === 'RUNNING' ? 'good' : stageObj.color;

    //Filter tasks
    if(nameTask.includes('migrator')) {
        return context.succeed();
    } else if(reasonStopCode.includes('Scaling activity initiated by')) {
        return context.succeed();
    } else if(stopCode === 'TaskFailedToStart') {
        return context.succeed();
    }

    /*
      Check first if the task is running and doesn't exist in redis
      then is the case where the codedeploy process stopped it by
      replace to newer task.
    */
    const keyEcsTask = `ecs_task_state:${nameTask}`;
    const taskRedisState = await redisConn.get(keyEcsTask);

    if(lastStatus === 'RUNNING' && !taskRedisState) {
        return context.succeed();
    }
    else if(lastStatus === 'RUNNING' && taskRedisState === 'STOPPED') {
        /*
          Check if the state is running and the key refis is stopped
          Then delete the key and notify that the task is running :)
        */
        await redisConn.del(keyEcsTask);
    }
    else if (lastStatus === 'STOPPED') {
        /*
          Set the key redis stopped to release once a task will be running and notify task stopped
        */
        await redisConn.set(keyEcsTask, lastStatus);
    }

    let postData = {
        channel: nameChannel,
        username: 'Infra Alert Bot',
        icon_emoji: ':exclamation:',
        mrkdwn: true
    };

    const link = `https://${dataJSON.region}.console.aws.amazon.com/ecs/home#/clusters/${nameCluster}/services/${nameTask}/events`;

    postData.attachments = [
        {
            color: severity,
            author_name: `INFRA - ${stageObj.stage.toUpperCase()}`,
            text: `*${nameTask.toUpperCase()}*: is ${lastStatus}${reasonStopCode !== '' ? ', ' + reasonStopCode: ''} (<${link}|More details>)`,
            mrkdwn_in: ['text'],
        }
    ];

    const options = {
        method: 'post',
        url: 'https://slack.com/api/chat.postMessage',
        data: postData,
        headers: {
            'Authorization': `Bearer ${slackInfraAlertBot}`
        }
    };

    try {
        await doRequest(options);
        return context.succeed();
    } catch (error) {
        logger.error('Error to send alerts: ', error);
        return context.fail(error);
    }
};

async function doRequest(options) {
    return await axios(options);
}

async function getStageSlack(){
    const iam = new AWS.IAM();
    const resultStage = await iam.listAccountAliases().promise();
    return resultStage.AccountAliases[0].includes('staging') ? { stage: 'staging', color: '#ffc76d' } :
        resultStage.AccountAliases[0].includes('production') ? { stage: 'production', color: '#ff0000' } : null;
}
