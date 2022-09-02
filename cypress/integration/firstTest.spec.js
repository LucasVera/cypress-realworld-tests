/// <reference types="cypress" />

describe('Test with backend', () => {

  beforeEach('login to the app', () => {
    // With these lines we tell cypress to mock the response of
    // GET /tags to the json that we have in fixtures:
    // cy.server();
    // cy.route('GET', '**/tags', 'fixture:tags.json');

    // We can specify simple route, or the routeHandler (object):
    // cy.intercept('GET', '**/tags', { fixture: 'tags.json' });
    cy.intercept({ method: 'Get', path: 'tags' }, { fixture: 'tags.json' });

    cy.loginToApplication();
  });

  it('should log in', () => {
    cy.log('Yay we logged in');
  });

  it('should create a new article successfully', () => {

    // Deprecated, use cy.intercept methods (cypress v6)
    // cy.server();
    // cy.route('POST', '**/articles').as('postArticles');

    cy.intercept('POST', 'https://conduit.productionready.io/api/articles').as('postArticles');

    // To intercept and change the response, we do the following:
    /*
        cy.intercept('POST', 'https://conduit.productionready.io/api/articles', (req) => {
          req.reply(res => {
            console.log('res', res);
            // First, assert the real value of the response is expected
            // expect(res.body.article.description).to.equal('This is a description');
            // Then replace the body with what you wnat
            res.asdf = 'This is a new property';
          });
        }).as('postArticles');
    */

    cy.contains('New Article').click();
    cy.get('[formcontrolname="title"]').type('This is a titlee' + new Date().valueOf());
    cy.get('[formcontrolname="description"]').type('This is a description');
    cy.get('[formcontrolname="body"]').type('This is a body of the article');
    cy.contains('Publish Article').click();

    // After creating the artcile, we intercept the api calls
    // So, wait for the response and it will be assigned to the object
    // defined int he route part
    cy.wait('@postArticles');
    cy.get('@postArticles').then(xhr => {
      console.log('xhr', xhr);
      // this is using cypress 5, but with cypress 6 intercept, the response is a little different
      // expect(xhr.status).to.equal(200);
      expect(xhr.response.statusCode).to.equal(307);
      expect(xhr.request.body.article.body).to.equal('This is a body of the article');
      expect(xhr.request.body.article.description).to.equal('This is a description');
    });
  });


  it('should gave tags with routing object', () => {
    // These assertions come from what we put in fixtures/tags.json
    // because in the beforeEach we are mocking that response
    // fixtures folder is the place to save your mock json responses
    cy.get('.tag-list')
      .should('contain', 'cypress')
      .and('contain', 'automation')
      .and('contain', 'testing');
  });

  it('delete an article', () => {
    // make http calls directly to the api instead of using the ui
    // Login, then create an article, then delete the article using ui
    // Then, get the articles list from api to verify it was deleted
    // const userCredentials = {
    //   "user": {
    //     "email": "lucas@lucasdev.info",
    //     "password": "12345678",
    //   }
    // };

    const bodyRequest = {
      "article": {
        "tagList": [],
        "title": "Request from api",
        "description": "api testing",
        "body": "testtt",
      }
    };

    // cy.request('POST', 'https://conduit.productionready.io/api/users/login', userCredentials)
    // .its('body').then(body => {
    //   const token = body.user.token;
    cy.get('@token').then(token => {

      cy.request({
        url: 'https://conduit.productionready.io/api/articles',
        headers: { 'Authorization': `Token ${token}` },
        body: bodyRequest,
      }).then(response => {
        expect(response.status).to.equal(200);

        cy.contains('Global Feed').click();
        cy.get('.article-preview').first().click();
        cy.get('.article-actions').contains('Delete Article').click();

        cy.request({
          url: 'https://conduit.productionready.io/api/articles?limit=10&offset=0',
          headers: { 'Authorization': `Token ${token}` },
          method: 'GET'
        }).its('body').then(body => {
          expect(body.articles[0].title).not.to.equal('Request from api');
        });

      });
    });
  });
});
