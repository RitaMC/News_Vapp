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

const moment = require('moment');
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

const themes = require('./Auxiliar/themes.json');

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
            
            this.$session.$data.themeChoosen = theme;
        }

        if(day){
            var datetime = new Date();
            var currentDay = moment(datetime);
            var askedDay = moment(day);

            if(currentDay.diff(askedDay) > 604800000){
                this.ask("You cannot ask for news that are more than one week old.");
                return;
            }else if(currentDay.diff(askedDay) < 0){
                this.ask("You cannot ask for tomorrow's news");
                return;
            }
            
             requestParams["to"] = '#{day}';
        }

        if(topN  && topN > 10){
            this.ask("The maximum number of news you can ask for is 10.");
            return;
        }

        await newsapi.v2.everything(requestParams).then(response => {

            for (let index = 0; index < 3; index++) {
                this.$speech.addText(response.articles[index].title)
                            .addBreak("2s")
                            .addText(response.articles[index].description)
                            .addBreak("2s")
                            .addText("published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD"))
                            .addBreak("4s");

                if(topN){
                    if(topN > 0){
                        topN--;
                    }else{
                        break;
                    }
                }
                
            }

            if(topN){
                if(topN > 0){
                    this.$session.$data.topN = topN;
                }else{
                    //The user asked for a top <= 3
                    this.ask(this.$speech);
                    return;
                }
            }else{
                //The user didn't ask for a top and we need to know if we still wants to hear more 2 news                
                this.$speech.addText("Want to hear more news?");
            }

            this.$session.$data.articles = response.articles;
            this.followUpState('NewsState').ask(this.$speech);
        }, error => {
            this.ask("I am sorry but I wasn't able to gather some news for you. Please try again later.");
        });
    },

    async HeadlinesIntent(){
        var theme = this.$inputs.theme.value;
        var day = this.$inputs.day.value;
        var topN = this.$inputs.newsNumber.value;

        var requestParams = {
            sources: 'bbc-news',
            language: 'en'
        };
        
        if(theme){
            requestParams["q"] = '#{theme}';
            
            this.$session.$data.themeChoosen = theme;
        }

        if(day){
            var datetime = new Date();
            var currentDay = moment(datetime);
            var askedDay = moment(day);

            if(currentDay.diff(askedDay) > 604800000){
                this.ask("You cannot ask for headlines that are more than one week old.");
                return;
            }else if(currentDay.diff(askedDay) < 0){
                this.ask("You cannot ask for tomorrow's headlines");
                return;
            }
            
             requestParams["to"] = '#{day}';
        }

        if(topN  && topN > 10){
            this.ask("The maximum number of headlines you can ask for is 10.");
            return;
        }

        await newsapi.v2.topHeadlines(requestParams).then(response => {

            for (let index = 0; index < 3; index++) {
                this.$speech.addText(response.articles[index].title)
                            .addBreak("2s")
                            .addText(response.articles[index].description)
                            .addBreak("2s")
                            .addText("published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD"))
                            .addBreak("4s");

                if(topN){
                    if(topN > 0){
                        topN--;
                    }else{
                        break;
                    }
                }
                
            }

            if(topN){
                if(topN > 0){
                    this.$session.$data.topN = topN;
                }else{
                    //The user asked for a top <= 3
                    this.ask(this.$speech);
                    return;
                }
            }else{
                //The user didn't ask for a top and we need to know if we still wants to hear more 2 headlines              
                this.$speech.addText("Want to hear more headlines?");
            }

            this.$session.$data.articles = response.articles;
            this.followUpState('HeadlinesState').ask(this.$speech);
        },
         error => { this.ask("I am sorry but I wasn't able to gather some headlines for you. Please try again later.");});
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

  
    CancelIntent(){
        this.ask("Want to do anything else today?");
    },

    YesIntent(){

    },

    NoIntent(){
        this.tell("Thank you for using the informed. Until a next time!");
    },

    StopIntent(){
        this.tell("Thank you for using the informed, your loyal news source. See you next time!");
    },

    NewsState: {
        YesIntent(){

        },

        NoIntent(){
            this.ask("Want to hear anything else today?","Perhaps some headlines about Business or Education.");
        }
    },

    HeadlinesState: {
        YesIntent(){

        },

        NoIntent(){
            this.ask("Want to hear anything else today?","Perhaps some news about Business or Education.");
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