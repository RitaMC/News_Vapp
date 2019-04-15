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

        if(this.$user.$metaData.sessionsCount == undefined || this.$user.$metaData.sessionsCount < 5){
            phrase = "Welcome to the informed where we have the latest news and headlines from around the globe! What do you want to hear about today?";
        }else{
            phrase = "Welcome to the Informed! What do you want to hear about today?";
        }

        this.$session.$data.last_phrase = phrase;
        this.$session.$data.numError = 0;

        this.$speech.addText(phrase);
        this.$reprompt.addText("What type of news do you want to hear?");

        this.ask(this.$speech,this.$reprompt);
    },


    async NewsIntent(){
        var theme = this.$inputs.theme.value;
        var day = this.$inputs.day.value;
        var topN = this.$inputs.newsNumber.value;

        this.$session.$data.requested = "NEWS";
        this.$session.$data.numError = 0;

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

            var news_phrase = "";

            for (let index = 0; index < len; index++) {
                news_phrase += response.articles[index].title;
                news_phrase += " <break time=\"1s\"/> ";
                news_phrase += response.articles[index].description;
                news_phrase += " <break time=\"1s\"/> ";
                news_phrase += "Published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD");
                news_phrase += " <break time=\"2s\"/> ";

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
                        this.$session.$data.last_phrase = "My source team could only gather "+len+" news for you. Want to do anything else?";
    
                        this.ask(this.$speech,"Want to do anything else today?");
                        return;
                    }

                    for(var i = 3; topN > 0; topN--,i++){
                        news_phrase += response.articles[i].title;
                        news_phrase += " <break time=\"1s\"/> ";
                        news_phrase += response.articles[i].description;
                        news_phrase += " <break time=\"1s\"/> ";
                        news_phrase += "Published in "+moment(response.articles[i].publishedAt).format("YYYY-MM-DD");
                        news_phrase += " <break time=\"2s\"/> ";
                    }
                }
                
                news_phrase += "Want to do anything else today?"

                this.$speech.addText(news_phrase);

                this.$session.$data.last_phrase = news_phrase;
                this.ask(this.$speech,"Want to do anything else today?");

                return;
            }

            //The user didn't ask for a top and we need to know if we still wants to hear more 2 news              
            news_phrase += "Want to hear more news?";
            this.$speech.addText(news_phrase);

            //So we don't have to access the API again
            this.$session.$data.articles = response.articles;

            this.$session.$data.last_phrase = news_phrase;

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
        this.$session.$data.numError = 0;

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
                this.$session.$data.last_phrase = "I am sorry but my sources cannot find headlines at the time. Please try again a little later.";

                this.ask(this.$speech,"Want to do anything else today?");
                return;
            }

            
            if(response.totalResults < 3){
                len = response.totalResults;
            }else{
                len = 3;
            }

            var headlines_phrase = "";

            for (var index = 0; index < len; index++) {
                headlines_phrase += response.articles[index].title;
                headlines_phrase += " <break time=\"1s\"/> ";
                headlines_phrase += "published in "+moment(response.articles[index].publishedAt).format("YYYY-MM-DD");
                headlines_phrase += " <break time=\"2s\"/> ";

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
                        this.$session.$data.last_phrase = "My source team could only gather "+len+" headlines for you. Want to do anything else?";

                        this.ask(this.$speech,"Want to do anything else today?");
                        return;
                    }

                    for(var i = 3 ; topN > 0; topN--, i++){
                        headlines_phrase += response.articles[i].title;
                        headlines_phrase += " <break time=\"1s\"/> ";
                        headlines_phrase += "published in "+moment(response.articles[i].publishedAt).format("YYYY-MM-DD");
                        headlines_phrase += " <break time=\"2s\"/> ";
                    }
                }

                headlines_phrase += "Want to do anything else today?";

                this.$speech.addText(headlines_phrase);
                this.$session.$data.last_phrase = headlines_phrase;
                
                this.ask(this.$speech,"Want to do anything else today?");
                return;
            }
            
            //The user didn't ask for a top and we need to know if we still wants to hear more 2 headlines              
            headlines_phrase += "Want to hear more headlines?"
            this.$speech.addText(headlines_phrase);

            //So we don't have to access the API again
            this.$session.$data.articles = response.articles;
            this.$session.$data.last_phrase = headlines_phrase;

            this.followUpState('HeadlinesState').ask(this.$speech,"Want to hear more headlines?");
        },
            error => { this.ask("I am sorry but I wasn't able to gather some headlines for you. Please try again later.");});
    },

    RepeatIntent(){
        var phrase = this.$session.$data.last_phrase;
        this.$session.$data.numError = 0;
        
        if(phrase == undefined){
            phrase = "Sorry, but there is nothing for me to repeat.";
        }

        this.$speech.addText(phrase);
        this.$reprompt.addText("Want to do anything else today?");

        this.ask(this.$speech,this.$reprompt);        
    },

    HelpIntent(){
        var phrase = "You can ask me for the latest news or the top headlines of the day. You can also ask me for news or headlines about a specific topic.";
      
        phrase += " <break time=\"1s\"/> ";
        phrase += "You can choose topics like Art, Finances, Sports, Technology and Politics. For more topics please consult the app description.";
        phrase += " <break time=\"1s\"/> ";
        phrase += "Want to know more?";

        this.$speech.addText(phrase);
        this.$reprompt.addText("Want to know more?");

        this.$session.$data.last_phrase = phrase;
        this.$session.$data.numError = 0;

        this.followUpState("HelpState").ask(this.$speech,this.$reprompt);
    },

    
    CancelIntent(){
        var req = this.$session.$data.requested;
        this.$session.$data.numError = 0;

        if(req === "NEWS"){
            this.$session.$data.last_phrase = "I can also tell you some headlines about a topic of your choice";
            this.$session.$data.requested = "default";

            this.ask("I can also tell you some headlines about a topic of your choice");
        }else if(req  === "HEADLINES"){
            this.$session.$data.last_phrase = "I can also tell you the latest news if you want";
            this.$session.$data.requested = "default";

            this.ask("I can also tell you the latest news if you want");
        }else{
            this.$session.$data.last_phrase = "I can also tell you some headlines or news about a topic of your choice";
            this.ask("I can also tell you some headlines or news about a topic of your choice");
        }        
    },

    YesIntent(){
        this.$session.$data.numError = 0;
        var req = this.$session.$data.requested;
        var phrase;

        if(req === "NEWS"){

            if(this.$session.$data.themeChoosen){
                phrase = "You just heard news about "+this.$session.$data.themeChoosen+". Why don't you ask me for today's top headlines?";
            }else{
                phrase = "You just heard the news. Why don't you ask me for today's top headlines?";
            }

            this.$session.$data.last_phrase = phrase;
            this.$session.$data.requested = "default";

            this.ask(phrase,"I can also tell you some headlines about a topic of your choice");
        }else if(req  === "HEADLINES"){

            if(this.$session.$data.themeChoosen){
                phrase = "You just heard some headlines about "+this.$session.$data.themeChoosen+". Why don't you ask me for today's news now?";
            }else{
                phrase = "You just heard some headlines. Why don't you ask me for today's news now?";
            }

            this.$session.$data.last_phrase = phrase;
            this.$session.$data.requested = "default";

            this.ask(phrase,"I can also tell you some news about a topic of your choice");
        }  
    },

    NoIntent(){
        this.toIntent('END');
    },

    END(){
        this.tell("Thank you for using the informed. Until a next time");
    },

    FallbackIntent(){
        var num_error = this.$session.$data.numError;
        var default_phrase = "Sorry but it seems that a problem has occurred. Can you tell me again what news or headlines you wanted to hear?";

        num_error++;

        this.$session.$data.numError = num_error;

        switch(num_error){
            case 1:
                this.ask("Sorry I can only tell you news or headlines.");
                break;
            case 2:
                this.ask("I am sorry but I didn't get your request. Do you want to hear the news perhaps?");
                break;
            case 3:
                this.tell("Sorry, that seems to be beyond my expertise, so let’s stop here for today. Goodbye!");
                break;
            default : this.ask(default_phrase);
        }       

    },

    Unhandled: function(){
        this.toIntent('FallbackIntent');
    },

    NewsState: {
        YesIntent(){
            var articles = this.$session.$data.articles;
            var news_phrase = "";

            for(var i = 3; i < NORMAL_MAX_NEWS_HEADLINES; i++){
                news_phrase += articles[i].title;
                news_phrase += " <break time=\"1s\"/> ";
                news_phrase += articles[i].description;
                news_phrase += " <break time=\"1s\"/> ";
                news_phrase += "Published in "+moment(articles[i].publishedAt).format("YYYY-MM-DD");
                news_phrase += " <break time=\"2s\"/> ";
            }

            news_phrase += "Want to do anything else today?";

            this.$speech.addText(news_phrase);
            this.$session.$data.last_phrase = news_phrase;
            this.$session.$data.numError = 0;

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
            var headlines_phrase = "";

            for(var i = 3; i < NORMAL_MAX_NEWS_HEADLINES; i++){
                headlines_phrase += articles[i].title;
                headlines_phrase += " <break time=\"1s\"/> ";
                headlines_phrase += "Published in "+moment(articles[i].publishedAt).format("YYYY-MM-DD");
                headlines_phrase += " <break time=\"2s\"/> ";
            }

            headlines_phrase += "Want to do anything else today?";

            this.$speech.addText(headlines_phrase);
            this.$session.$data.last_phrase = headlines_phrase;
            this.$session.$data.numError = 0;

            this.followUpState(null).ask(this.$speech,"Want to do anything else today?");
        },

        NoIntent(){
            var randomTheme = themes[Math.floor(Math.random()*themes.len)];

            this.$session.$data.last_phrase = "Want to hear anything else today? Perhaps some news about "+`${randomTheme}`+"?";
            this.$session.$data.numError = 0;
          
            this.followUpState(null).ask("Want to hear anything else today?","Perhaps some news about "+`${randomTheme}`+"?");
        }
    },

    HelpState: {
        YesIntent(){
            var phrase = "You can also ask me for a top with at most 10 news or headlines";
            phrase += "<break time=\"0.20ms\"/>";
            phrase +=  "and for news or headlines that are one day to a week old.";
            phrase += " <break time=\"1s\"/> ";
            phrase += "What do you want to hear?"

            this.$speech.addText(phrase);
            this.$reprompt.addText("What do you want to hear?");
            this.$session.$data.last_phrase = phrase;
            this.$session.$data.numError = 0;

            this.followUpState(null).ask(this.$speech,this.$reprompt);
        },

        NoIntent(){
            this.$session.$data.last_phrase = "What do you want to hear today? Headlines or news?";
            this.$session.$data.numError = 0;

            this.followUpState(null).ask("What do you want to hear today?", "Headlines or news?");
        }
    }
});


module.exports.app = app;