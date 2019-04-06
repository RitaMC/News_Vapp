'use strict';

// ------------------------------------------------------------------
// APP INITIALIZATION
// ------------------------------------------------------------------

//Note: to initializate a project use 'jovo init' and then put this file and the config file in
//the correct folders

const { App } = require('jovo-framework');
const { Alexa } = require('jovo-platform-alexa');
const { GoogleAssistant } = require('jovo-platform-googleassistant');
const { JovoDebugger } = require('jovo-plugin-debugger');
const { DynamoDb } = require('jovo-db-dynamodb');
const NewsAPI = require('newsapi');

const newsapi = new NewsAPI('a66c647de3b2494eb9bd426b30cef49b');

const app = new App();

app.use(
    new Alexa(),
    new GoogleAssistant(),
    new JovoDebugger(),

// Enable DB( after app initialization
    new DynamoDb(),
);

const NORMAL_MAX_NEWS_HEADLINES = 5;

const TOP_MAX_NEWS_HEADLINES = 10;

// ------------------------------------------------------------------
// APP LOGIC
// ------------------------------------------------------------------

app.setHandler({
    LAUNCH() {
        return this.toIntent('WelcomeIntent');
    },
    WelcomeIntent(){
        var phrase;

        if(this.$user.isNewUser()){
            this.$user.$data.numberOfTimesUsed = 0;
        }else if(this.$user.$data.numberOfTimesUsed < 5){
            phrase = "Welcome to the informed where we have the latest news and headlines from around the globe! What do you want to hear about today?";
        }else{
            phrase = "Welcome to the Informed! What do you want to hear about today?";
        }

        this.$session.last_phrase = phrase;

        this.$speech.addText(phrase);
        this.$reprompt.addText("What type of news do you want to hear?");

        this.ask(this.$speech,this.$reprompt);
    },

    async NewsIntent(){
        var theme = this.$inputs.theme.value;
        var day = this.$inputs.day.value;
        var topN = this.$inputs.newsNumber.value;

        var requestParams = {
            sources: 'bbc-news',
            language: 'en'
        };
        
        if(theme){
            requestParams["q"] = '#{theme}';
        }

        //Verificar  se o dia È hj pq se não for temos de colocar a info "from" para além da "to"
        if(day){

        }

        await newsapi.v2.everything(requestParams).then(response => {
            this.ask(response.articles[0].title);
        });
    },

    HeadlinesIntent(){

    },

    RepeatIntent(){
        var phrase = this.$session.last_phrase;
        
        if(phrase.lenght == 0){
            phrase = "Sorry, but there is nothing for me to repeat.";
        }

        this.$speech.addText(phrase);
        this.$reprompt.addText(phrase);

        this.ask(this.$speech,this.$reprompt);        
    },

    HelpIntent(){
        this.$speech.addText("You can ask me for the latest news or the top headlines of the day. You can also ask me for news or headlines about a specific topic.")
                    .addBreak("200ms").addText("Want to know more?");
        this.$reprompt.addText("Want to know more?");

        this.ask(this.$speech,this.$reprompt);
    },

    //After this intent the user will likely say yes or no and we need to provide him an answer accordingly
    CancelIntent(){
        this.ask(this.$speech.addText("Want to do anything else today?"));
    },

    YesIntent(){

    },

    NoIntent(){

    },

    StopIntent(){
        this.tell(this.$speech.addText("Thank you for using the informed, your loyal news source. See you next time!"));
    },

    NewsState: {
        YesIntent(){

        },

        NoIntent(){

        }
    },

    HeadlinesState: {
        YesIntent(){

        },

        NoIntent(){

        }
    },

    HelpState: {
        YesIntent(){
            this.$speech.addText("You can also ask me for the top 10 news or headlines and for news that are one day to a week old.")
                        .addBreak("100ms").addText("What do you want to hear?");
            this.$reprompt.addText("What do you want to hear?");

            this.ask(this.$speech,this.$reprompt);
        },

        NoIntent(){
            this.followUpState(null).ask("What do you want to hear today?");
        }
    },

    FallbackIntent(){

    },

    Unhandled: function(){
        this.toIntent('FallbackIntent');
    }
});


module.exports.app = app;