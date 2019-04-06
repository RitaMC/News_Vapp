// ------------------------------------------------------------------
// APP CONFIGURATION
// ------------------------------------------------------------------

module.exports = {
    logging: true,

// Mapping of the built-in intents
    intentMap: {
        'Amazon.FallbackIntent' : 'FallbackIntentHandler',
            'Amazon.YesIntent' : 'YesIntentHandler',
            'Amazon.StopIntent' : 'END',
            'Amazon.NoIntent' : 'NoIntentHandler',
            'Amazon.HelpIntent' : 'HelpIntentHandler',
            'Amazon.RepeatIntent' : 'RepeatIntentHandler',
            'Amazon.CancelIntent' : 'CancelIntentHandler',
            'Amazon.NavigateHomeIntent' : 'NavigateHomeIntentHandler',
    },
    //Define intents that shouldn't be matched to an Unhandled Intent if not found in a State
    //instead they will be captured globally
    intentsToSkipUnhandled: [
        'END'
    ],

    user: {
        metaData: {
            enabled: false,
            lastUsedAt: true,
            sessionsCount: true,
            createdAt: true,
            requestHistorySize: 4,
            devices: true,
        },
    },

    db: {
            
        //For code that is running on Lambda
        //if you are hosting the voice app elsewhere plase add an AWS config
        DynamoDB: {
            tableName: 'TheInformed',
        },
    },
};