# Nightlife with Yelp
This application coordinates bar-hopping with you and your friends by
giving you results of bars at a given location or your navigation location.

FCC User Stories :
* As an unauthenticated user, you can view all bars in your area
* As an authenticated user, you can remove yourself from a bar if you no longer want to go there
* As an unauthenticated user, when you login you shouldn't have to search again

My Added Features :
* Create your own friends social circle
* Click a search result to save

## Dependencies
1. Twitter API ( For authentication )
2. Yelp API
3. NodeJS / Express
4. EJS
5. dotenv
6. MongoDB / Mongoose

## How to Install

## Model
```
Nightlife_user :
------ _id
------ username - String
------ twitter_id - String
------ my_bars - Array of Object ids [  ]
------ my_friends - Array of Object ids [ Nightlife_user ]
------ my_friend_requests - Array of Object ids [ Pending Users who want to connect ]

My_bars :
------ _id
------ name
------ picture
------ description
------ url
------ user_owner - Object id of Nightlife user
------ people_going - Array of Object ids [ Nightlife_user ]

```

## Pages
```
1. Frontpage (index.ejs) :
  a. Has a search-bar that searches Yelp and returns top 20 results
  b. Every search results have number of friends going
  c. If you hover at the number, you get a list of friends who are going
  d. Every search result has an option to save
  e. You can view all friends' bar lists
  f.

2. Friends list (my_friends.ejs) :
  a. Shows a list of current friends
  b. Click to show their list

3. Connect with people (connect.ejs) :
  a. Shows a list of all people
  b. Click to connect
```

* First show a search bar

## Author
Neptune Michael cabelin

## License
MIT
