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
        }
        
        if(this.$user.$data.numberOfTimesUsed < 5){
            phrase = "Welcome to the informed where we have the latest news and headlines from around the globe! What do you want to hear about today?";
        }else{
            phrase = "Welcome to the Informed! What do you want to hear about today?";
        }

        this.$session.$data.last_phrase = phrase;


        this.$speech.addText(phrase);
        this.$reprompt.addText("What type of news do you want to hear?");

        this.$user.$data.numberOfTimesUsed++;

        this.ask(this.$speech,this.$reprompt);
    },


    async NewsIntent(){
        var theme = this.$inputs.theme.value;
        var day = this.$inputs.day.value;
        var topN = this.$inputs.newsNumber.value;

        this.$session.$data.requested = "NEWS";

        var requestParams = {
            sources: 'bbc-news',
            pageSize: 10,
            language: 'en'
        };
        
        if(theme != undefined && theme != ""){
            theme = theme.toLowerCase();
        
            //If the user asked for a correct theme
            if(themes.indexOf(theme) > -1){
                requestParams["q"] = `${theme}`;
            
                this.$session.$data.themeChoosen = theme;
            }else{
                var randomTheme = themes[Math.floor(Math.random()*themes.len)];
                
                this.$session.$data.last_phrase = "My source team just got back to me and they didn't find news about that topic. Why don't you ask me for news about "+`${randomTheme}`+"?";
                this.ask("My source team just got back to me and they didn't find news about that topic. Why don't you ask me for news about "+`${randomTheme}`+"?");
                return;
            }
        }

        if(day != undefined && day != ""){
            var datetime = new Date();

            if(moment(datetime).diff(moment(day)) > 604800000){
                this.$session.$data.last_phrase = "I am sorry but I only keep the records of news that are one day to a week old. Please choose another day.";
                this.ask("I am sorry but I only keep the records of news that are one day to a week old. Please choose another day.");
                return;
            }else if(moment(datetime).diff(moment(day)) < 0){
                this.$session.$data.last_phrase = "You cannot ask for tomorrow's news";
                this.ask("You cannot ask for tomorrow's news");

                return;
            }
            
                requestParams["to"] = `${day}`;
        }

        if(topN != undefined  && topN > TOP_MAX_NEWS_HEADLINES && topN != ""){
            this.$session.$data.last_phrase = "I am sorry but my sources can only elaborate top's that contain at max 10 news. Please choose another number.";
            this.ask("I am sorry but my sources can only elaborate top's that contain at max 10 news. Please choose another number.");
            return;
        }else if(topN != undefined && topN < 0 && topN != ""){
            this.$session.$data.last_phrase = "Please choose a number greater than zero for your top.";
            this.ask("Please choose a number greater than zero for your top.");
            return;
        }

        await newsapi.v2.everything(requestParams).then(response => {
            var len;

            if(response.status === "error" || response.totalResults == 0){
                this.$session.$data.last_phrase = "I am sorry but my sources cannot find news at the time. Please try again a little later.";
                this.$speech.addText("I am sorry but my sources cannot find news at the time. Please try again a little later.");

                this.ask(this.$speech,"Want to do anything else today?");
                return;
            }

            
            if(response.totalResults < 3){
                len = response.totalResults;
            }else{
                len = 3;
            }


            for (let index = 0; index < len; index++) {
                this.$speech.addText(response.articles[index].title)
                            .addText("<break time=\"1s\"/>")
                            .addText(response.articles[index].description)
                            .addText("<break time=\"1s\"/>")
                            .addText("Published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD"))
                            .addText("<break time=\"2s\"/>")

                if(topN != undefined && topN != ""){
                    if(topN > 0){
                        topN--;
                    }else{
                        break;
                    }
                }
                
            }

            if(topN != undefined && topN != ""){

                //if the user asked for a top > 3
                //else just return the news
                if(topN > 0){

                    //If we couldn't find enough news
                    if(len < 3){
                        this.$speech.addText("My source team could only gather "+len+" news for you. Want to do anything else?");
                        this.$session.$data.last_phrase = this.$speech;
    
                        this.ask(this.$speech,"Want to do anything else today?");
                        return;
                    }

                    for(var i = 3; topN > 0; topN--){
                        this.$speech.addText(response.articles[i].title)
                                    .addText("<break time=\"1s\"/>")
                                    .addText(response.articles[i].description)
                                    .addText("<break time=\"1s\"/>")
                                    .addText("Published in "+moment(response.articles[i].publishedAt).format("YYYY-MM-DD"))
                                    .addText("<break time=\"2s\"/>")
                    }
                }
                
                this.$speech.addText("Want to do anything else today?");

                this.$session.$data.last_phrase = this.$speech;
                this.ask(this.$speech);

                return;
            }

            //The user didn't ask for a top and we need to know if we still wants to hear more 2 news                
            this.$speech.addText("Want to hear more news?");

            //So we don't have to access the API again
            this.$session.$data.articles = response.articles;

            this.$session.$data.last_phrase = this.$speech;

            this.followUpState('NewsState').ask(this.$speech,"Want to hear more news?");
        }, error => {
            this.ask("I am sorry but I wasn't able to gather some news for you. Please try again later.");
        });
    },

    async HeadlinesIntent(){
        var theme = this.$inputs.themeHeadlines.value;
        var day = this.$inputs.dayHeadlines.value;
        var topN = this.$inputs.headlinesNumber.value;

        this.$session.$data.requested = "HEADLINES";

        var requestParams = {
            sources: 'bbc-news',
            pageSize: 10,
            language: 'en'
        };
        
        if(theme != undefined && theme != ""){
            theme = theme.toLowerCase();

            if(themes.indexOf(theme) > -1){
                requestParams["q"] = `${theme}`;
            
                this.$session.$data.themeChoosen = theme;
            }else{
                var randomTheme = themes[Math.floor(Math.random()*themes.len)];
                this.$session.$data.last_phrase = "I checked my sources and i can't seem to find headlines about that topic. Why don't you ask me for headlines about about "+`${randomTheme}`+"?";

                this.ask("I checked my sources and i can't seem to find headlines about that topic. Why don't you ask me for headlines about about "+`${randomTheme}`+"?");
                return;
            }
        }

        if(day != undefined && day != ""){
            var datetime = new Date();

            if(moment(datetime).diff(moment(day)) > 604800000){
                this.$session.$data.last_phrase = "I am sorry but I only keep headlines that are one day to a week old. Please choose another day.";
                this.ask("I am sorry but I only keep headlines that are one day to a week old. Please choose another day.");
                return;
            }else if(moment(datetime).diff(moment(day)) < 0){
                this.$session.$data.last_phrase = "You cannot ask for tomorrow's headlines";
                this.ask("You cannot ask for tomorrow's headlines");
                return;
            }
            
                requestParams["to"] = `${day}`;
        }

        if(topN != undefined && topN > TOP_MAX_NEWS_HEADLINES && topN != ""){
            this.$session.$data.last_phrase = "I am sorry but the top headlines that I am allowed to tell at a time is 10. Would you kindly change your number?";
            this.ask("I am sorry but the top headlines that I am allowed to tell at a time is 10. Would you kindly change your number?");
            return;
        }else if(topN != undefined && topN < 0 && topN != ""){
            this.$session.$data.last_phrase = "Please choose a number greater than zero for your top.";
            this.ask("Please choose a number greater than zero for your top.");
            return;
        }

        await newsapi.v2.topHeadlines(requestParams).then(response => {
            var len;

            if(response.status === "error" || response.totalResults == 0){
                this.$speech.addText("I am sorry but my sources cannot find headlines at the time. Please try again a little later.");
                this.$session.$data.last_phrase = this.$speech;

                this.ask(this.$speech,"Want to do anything else today?");
                return;
            }

            
            if(response.totalResults < 3){
                len = response.totalResults;
            }else{
                len = 3;
            }

            for (var index = 0; index < len; index++) {
                this.$speech.addText(response.articles[index].title)
                            .addText("<break time=\"1s\"/>")
                            .addText("published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD"))
                            .addText("<break time=\"2s\"/>")

                if(topN != undefined && topN != ""){
                    if(topN > 0){
                        topN--;
                    }else{
                        break;
                    }
                }
            }


            if(topN != undefined && topN != ""){
                if(topN > 0){
                    if(len < 3){
                        this.$speech.addText("My source team could only gather "+len+" headlines for you. Want to do anything else?")
                        this.$session.$data.last_phrase = this.$speech;

                        this.ask(this.$speech,"Want to do anything else today?");
                        return;
                    }

                    for(var i = 3 ; topN > 0; topN--){
                        this.$speech.addText(response.articles[i].title)
                                    .addText("<break time=\"1s\"/>")
                                    .addText("published in "+moment(response.articles[i].publishedAt).format("YYYY-MM-DD"))
                                    .addText("<break time=\"2s\"/>")
                    }
                }

                this.$speech.addText("Want to do anything else today?");
                this.$session.$data.last_phrase = this.$speech;
                
                this.ask(this.$speech,"Want to do anything else today?");
                return;
            }
            
            //The user didn't ask for a top and we need to know if we still wants to hear more 2 headlines              
            this.$speech.addText("Want to hear more headlines?");

            //So we don't have to access the API again
            this.$session.$data.articles = response.articles;
            this.$session.$data.last_phrase = this.$speech;

            this.followUpState('HeadlinesState').ask(this.$speech,"Want to hear more headlines?");
        },
            error => { this.ask("I am sorry but I wasn't able to gather some headlines for you. Please try again later.");});
    },

    RepeatIntent(){
        var phrase = this.$session.last_phrase;
        
        if(phrase.lenght == 0){
            phrase = "Sorry, but there is nothing for me to repeat.";
        }

        this.$speech.addText(phrase);
        this.$reprompt.addText("Want to do anything else today?");

        this.ask(this.$speech,this.$reprompt);        
    },

    HelpIntent(){
        this.$speech.addText("You can ask me for the latest news or the top headlines of the day. You can also ask me for news or headlines about a specific topic.")
                    .addText("<break time=\"1s\"/>")
                    .addText("You can choose topics like Art, Finances, Sports, Technology and Politics. For more topics please consult the app description.")
                    .addText("<break time=\"1s\"/>")
                    .addText("Want to know more?");
                    
        this.$reprompt.addText("Want to know more?");
        this.$session.$data.last_phrase = this.$speech;

        this.ask(this.$speech,this.$reprompt);
    },

    
    CancelIntent(){
        var req = this.$session.$data.requested;

        if(req === "NEWS"){
            this.$session.$data.last_phrase = "I can also tell you some headlines about a topic of your choice";
            this.ask("I can also tell you some headlines about a topic of your choice");
        }else if(req  === "HEADLINES"){
            this.$session.$data.last_phrase = "I can also tell you the latest news if you want";
            this.ask("I can also tell you the latest news if you want");
        }else{
            this.$session.$data.last_phrase = "I can also tell you some headlines or news about a topic of your choice";
            this.ask("I can also tell you some headlines or news about a topic of your choice");
        }        
    },

    YesIntent(){

    },

    NoIntent(){
        this.tell("Thank you for choosing us as your news source! See you next time");
    },

    StopIntent(){
        this.tell("Thank you for using the informed. See you next time");
    },

    FallbackIntent(){
        this.tell("Error");
    },

    Unhandled: function(){
        this.toIntent('FallbackIntent');
    },

    NewsState: {
        YesIntent(){
            var articles = this.$session.$data.articles;

            for(var i = 3; i < NORMAL_MAX_NEWS_HEADLINES; i++){
                this.$speech.addText(articles[i].title)
                            .addText("<break time=\"1s\"/>")
                            .addText(articles[i].description)
                            .addText("<break time=\"1s\"/>")
                            .addText("Published in "+moment(articles[i].publishedAt).format("YYYY-MM-DD"))
                            .addText("<break time=\"2s\"/>")
            }

            this.$speech.addText("Want to do anything else today?");
            this.$session.$data.last_phrase = this.$speech;

            this.followUpState(null).ask(this.$speech,"Want to do anything else today?");
        },

        NoIntent(){
            var randomTheme = themes[Math.floor(Math.random()*themes.len)];

            this.$session.$data.last_phrase = "Want to hear anything else today? Perhaps some headlines about "+`${randomTheme}`+"?";

            this.followUpState(null).ask("Want to hear anything else today?","Perhaps some headlines about "+`${randomTheme}`+"?");
        }
    },

    HeadlinesState: {
        YesIntent(){
            var articles = this.$session.$data.articles;

            for(var i = 3; i < NORMAL_MAX_NEWS_HEADLINES; i++){
                this.$speech.addText(articles[i].title)
                            .addText("<break time=\"1s\"/>")
                            .addText("Published in "+moment(articles[i].publishedAt).format("YYYY-MM-DD"))
                            .addText("<break time=\"2s\"/>")
            }

            this.$speech.addText("Want to do anything else today?");
            this.$session.$data.last_phrase = this.$speech;

            this.followUpState(null).ask(this.$speech,"Want to do anything else today?");
        },

        NoIntent(){
            var randomTheme = themes[Math.floor(Math.random()*themes.len)];

            this.$session.$data.last_phrase = "Want to hear anything else today? Perhaps some news about "+`${randomTheme}`+"?";
          
            this.followUpState(null).ask("Want to hear anything else today?","Perhaps some news about "+`${randomTheme}`+"?");
        }
    },

    HelpState: {
        YesIntent(){
            this.$speech.addText("You can also ask me for the top 10 news or headlines and for news that are one day to a week old.")
                        .addText("<break time=\"1s\"/>")
                        .addText("What do you want to hear?");

            this.$reprompt.addText("What do you want to hear?");
            this.$session.$data.last_phrase = this.$speech;

            this.followUpState(null).ask(this.$speech,this.$reprompt);
        },

        NoIntent(){
            this.$session.$data.last_phrase = "What do you want to hear today? Headlines or news?";

            this.followUpState(null).ask("What do you want to hear today?", "Headlines or news?");
        }
    }
});


module.exports.app = app;