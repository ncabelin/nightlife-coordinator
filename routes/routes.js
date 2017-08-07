var express = require('express');
var router = express.Router(),
    twitter = require('../auth/twitter'),
    My_bar = require('../models/my_bars'),
    User = require('../models/users');

router.get('/', function(req, res) {
  res.render('index', {
    user: req.user || '',
    page: 'home'
  });
})

.get('/auth/twitter', twitter.authenticate('twitter'))
.get('/auth/twitter/callback', twitter.authenticate('twitter', { failureRedirect: '/login' }), function(req, res) {
  res.redirect('/');
});

router.get('/login', function(req, res) {
  res.render('login', {
    user: req.user || '',
    page: 'login'
  });
});

router.get('/logout', isLoggedIn, function(req, res) {
  req.logout();
  res.redirect('/')
});

function isLoggedIn(req, res, next) {
  if (req.user) {
    return next();
  }
  res.redirect('/login');
}

router.get('/add', isLoggedIn, function(req, res) {
  res.render('add', {
    user: req.user || '',
    message: req.query.message || '',
    page: 'new_poll'
  });
}).post('/add', isLoggedIn, function(req, res) {
  var question = req.body.question,
      options = req.body.options.split('\r\n'),
      picture = req.body.picture;
      err = '';

  if (options.length < 2) {
    err += 'Options must be more than 1. ';
  }

  if (!question) {
    err += 'Question is required. ';
  }

  if (err) {
    res.redirect('/add?message=' + err);
  }

  // remove blanks spaces
  var clean_options = []
  options.forEach(function(option) {
    if (option) {
      clean_options.push(option);
    }
  });

  Poll.create({
    user: {
      id: req.user._id
    },
    picture: picture,
    question: question
  }, function(err, poll) {
    if (err) {
      return res.status(400).json({'message': 'error saving poll'});
    } else {
      User.findById(req.user._id, function(err, foundUser) {
        if (err) {
          return res.status(400).json({'message':'User not found'});
        } else {
          foundUser.polls.push(poll);
          foundUser.save(function(err, user) {
            if (err) { return res.status(400) }
            else {
              clean_options.forEach(function(option) {
                PollOption.create({
                  poll: {
                    id: poll._id
                  },
                  option: option,
                  count: 0
                }, function(err, pollOption) {
                  if (err) {
                    return res.status(400).json({'message': 'error saving option'});
                  } else {
                    Poll.findById(poll._id, function(err, foundPoll) {
                      if (err) {
                        return res.status(400).json({'message': 'error finding poll'});
                      } else {
                        foundPoll.options.push(pollOption);
                        foundPoll.save(function(err, poll) {
                          if (err) { return res.status(400) }
                        });
                      }
                    });
                  }
                });
              });
              res.redirect('/my_polls?message=Poll successfully added');
            }
          });
        }
      });
    }
  });
});

router.get('/edit_delete/:poll_id', isLoggedIn, function(req, res) {
  Poll.findById(req.params.poll_id)
    .populate('options')
    .exec(function(err, foundPoll) {
      // check if logged in user is the author of poll id
      if (foundPoll.user.id.toString() !== req.user._id.toString()) {
        res.status(400).json({'error':'not authorized'});
      } else {
        res.render('edit_delete', {
          user: req.user || '',
          poll: foundPoll,
          message: req.query.message || '',
          page: 'my_polls'
        });
      }
    })
})
.put('/edit/:poll_id', isLoggedIn, function(req, res) {
  Poll.findById(req.params.poll_id)
    .populate('options')
    .exec(function(err, foundPoll) {
    if (err) {
      res.status(400).json({'error':'error finding poll'})
    } else if (foundPoll.user.id.toString() !== req.user._id.toString()) {
      res.status(400).json({'error':'not authorized to edit this poll'})
    } else {
      var options = req.body.text.split('\n');
      // remove blanks spaces
      var clean_options = []
      options.forEach(function(option) {
        if (option) {
          clean_options.push(option);
        }
      });
      if (clean_options) {
        clean_options.forEach(function(option) {
          PollOption.create({
            poll: {
              id: foundPoll._id
            },
            option: option,
            count: 0
          }, function(err, pollOption) {
            if (err) {
              return res.status(400).json({'message': 'error saving option'});
            } else {
              foundPoll.options.push(pollOption)
              foundPoll.save();
            }
          });
        });
        foundPoll.picture = req.body.picture;
        foundPoll.question = req.body.question;
        foundPoll.save();
        res.redirect('/edit_delete/' + req.params.poll_id + '?message=Successfully edited');
      }
    }
  });
})
.delete('/delete/:poll_id', isLoggedIn, function(req, res) {
  // delete poll
  Poll.findById(req.params.poll_id, function(err, poll) {
    if (err) {
      res.status(400).json({'error':'error finding poll'})
    } else if (poll.user.id.toString() !== req.user._id.toString()) {
      res.status(400).json({'error':'not authorized to delete this poll'})
    } else {
      poll.options.forEach(function(id) {
        PollOption.findByIdAndRemove(id, function(err, d) {
          console.log(d);
        });
      });
      poll.remove();
      res.status(200).json({'success':'deleted poll'});
    }
  });
});

router.delete('/options/:poll_id/delete/:option_id', isLoggedIn, function(req, res) {
  Poll.findById(req.params.poll_id)
    .populate('options')
    .exec(function(err, foundPoll) {
    if (err) {
      res.status(400).json({'message':'Poll option error in deleting'});
    } else {
      if (foundPoll.user.id.toString() === req.user._id.toString()) {
        foundPoll.options.forEach(function(d) {
          if (d._id.toString() === req.params.option_id) {
            d.remove();
          }
        });
        foundPoll.save();
        res.status(200).json({'message':'Delete success'});
      }
    }
  })
});

router.get('/my_polls', isLoggedIn, function(req, res) {
  User.findOne({ _id: req.user._id })
    .populate('polls')
    .exec(function(err, user) {
      res.render('my_polls', {
        user: req.user || '',
        polls: user.polls || [],
        message: req.query.message || '',
        page: 'my_polls'
      });
    })
});

router.get('/vote_poll/:poll_id', function(req, res) {
  if (req.query.submit) {
    var submit = true;
  }
  Poll.findOne({ _id: req.params.poll_id })
    .populate('options')
    .exec(function(err, foundPoll) {
      res.render('vote_poll', {
        user: req.user || '',
        poll: foundPoll,
        message: req.query.message || '',
        submit: submit || '',
        page: 'my_polls'
      });
    })
  })
  .post('/vote_poll/:poll_id/:vote_id', function(req, res) {
    console.log('yes');
    // look for ip
    var ip = req.ip,
        poll_id = req.params.poll_id;
        vote_id = req.params.vote_id;
    IpAddress.findOne({ ip: ip}, function(err, ipadd) {
      if (err) {
        res.status(400).json({'error':'error finding ip'})
      }
      if (ipadd) {
        // check if ipadd has the poll id
        var index = ipadd.polls.indexOf(poll_id);
        if (index === -1) {
          // add poll id to ip address
          ipadd.polls.push(poll_id);
          ipadd.save();
          // increment vote to poll-option
          PollOption.findOne({ _id: vote_id }, function(err, poll_option) {
            if (err) { res.status(400).json({'message':'error finding poll option'})}
            poll_option.count += 1;
            poll_option.save();
            res.redirect('/vote_poll/' + poll_id);
          });
        } else {
          // else ip found
          res.status(400).json({'message':'Sorry this ip address cannot vote more than once in this poll'});
        }
      } else {
        // no existing ip address, create new ip address
        var newIp = new IpAddress({
          ip: ip,
          polls: [poll_id]
        })
        newIp.save();
        // increment vote to poll-option
        PollOption.findOne({ _id: vote_id }, function(err, poll_option) {
          if (err) { res.status(400).json({'message':'error finding poll option'})}
          poll_option.count += 1;
          poll_option.save();
          res.redirect('/vote_poll/' + poll_id);
        });
      }
    });
  }).post('/add_vote_option/:poll_id', function(req, res) {
    Poll.findById(req.params.poll_id)
      .populate('options')
      .exec(function(err, foundPoll) {
        if (err) {
          res.status(400).json({'message':'error adding vote option'});
        } else {
          if (req.user) {
            PollOption.create({
              poll: {
                id: foundPoll._id
              },
              option: req.body.option,
              count: 0
            }, function(err, poll_option) {
              if (err) {
                res.status(400).json({'message':'error adding'});
              } else {
                foundPoll.options.push(poll_option);
                foundPoll.save();
                res.status(200).json({'message':'added'});
              }
            })
          }
        }
      });
  });

module.exports = router;
