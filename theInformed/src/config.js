// ------------------------------------------------------------------
// APP CONFIGURATION
// ------------------------------------------------------------------

module.exports = {
    logging: true,

// Mapping of the built-in intents
    intentMap: {
        'AMAZON.FallbackIntent' : 'FallbackIntent',
            'AMAZON.YesIntent' : 'YesIntent',
            'AMAZON.StopIntent' : 'StopIntent',
            'AMAZON.NoIntent' : 'NoIntent',
            'AMAZON.HelpIntent' : 'HelpIntent',
            'AMAZON.RepeatIntent' : 'RepeatIntent',
            'AMAZON.CancelIntent' : 'CancelIntent',
            'AMAZON.NavigateHomeIntent' : 'NavigateHomeIntent',
    },
    //Define intents that shouldn't be matched to an Unhandled Intent if not found in a State
    //instead they will be captured globally
    intentsToSkipUnhandled: [
        'StopIntent',
        'CancelIntent',
        "FallbackIntent"
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
        DynamoDb: {
            tableName: 'TheInformed',
        },
    },
};