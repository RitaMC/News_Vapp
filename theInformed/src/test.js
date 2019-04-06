const NewsAPI = require('newsapi');

const newsapi = new NewsAPI('a66c647de3b2494eb9bd426b30cef49b');

function a(){
    newsapi.v2.topHeadlines({
        q: 'trump',
        category: 'politics',
        from: '2019-03-05',
        language: 'en',
        country: 'us'
      }).then(response => {
        var data = response;
        console.log(data.articles[0].title);
        console.log(data.articles[0].description);
        //Extrair dia/mês e hora
        console.log(data.articles[0].publishedAt);
      });
}

a();