/* Copyright (c) 2014 Richard Rodger, MIT License */
'use strict';


var _     = require('underscore')
var nid   = require('nid')
var async = require('async')



module.exports = function( options ) {
  /*jshint validthis:true */

  var seneca = this
  var plugin = 'card'


  options = seneca.util.deepextend({
    removeLimit: 5
  },options)
  


  seneca.add({
    role: plugin,
    make: 'top'

  }, make_top)


  seneca.add({
    role: plugin,
    cmd: 'children'

  }, cmd_children)



/*
  seneca.add({
    role: plugin,
    cmd: 'move',

  }, cmd_move)

  seneca.add({
    role: plugin,
    cmd: 'order',

  }, cmd_order)
*/



  seneca.add({
    role: plugin,
    cmd: 'relate'

  }, cmd_relate)


  seneca.add({
    role: plugin,
    cmd: 'unrelate'

  }, cmd_unrelate)



  seneca.add({
    role: 'entity',
    base: 'card',
    cmd:  'save'

  }, card_save)


  seneca.add({
    role: 'entity',
    base: 'card',
    cmd:  'load'

  }, card_load)


  seneca.add({
    role: 'entity',
    base: 'card',
    cmd:  'remove'

  }, card_remove)




  var cardent = seneca.make('card/card')


  seneca.act({
    role: 'util',
    cmd:  'ensure_entity',

    pin:{role:'card',cmd:'*'},

    entmap:{
      card:cardent
    }
  })



  function make_top(args, done){
    var seneca = this

    var topent = seneca.make('card/top')

    var top = topent.make$({
      title: args.title
    })

    top.save$(function (err, top) {
      if (err) return done(err);

      return done(null, top)
    })
  }



  function cmd_children(args, done) {
    var seneca = this

    var cardent = seneca.make('card/card')

    cardent.load$(args.card.id, function (err, card) {
      if (err) return done(err);
      if (!card) return done(seneca.fail('card-not-found', {id: args.card.id}));

      cardent.list$({parent: card.id}, function (err, children) {
        if (err) return done(err);

        var childmap = {}

        _.each(children, function (child) {
          childmap[child.id] = {
            id: child.id,
            name: child.name,
            title: child.title
          }
        })

        var out = []
        _.each(card.children, function (childid) {
          if (childmap[childid])
            out.push(childmap[childid])
        })

        done(null, {
          card: card.id,
          top: card.top,
          children: out
        })
      })
    })
  }



  function cmd_relate(args, done) {
    var seneca = this

    var cardent = seneca.make('card/card')

    var content  = args.ent
    var cardname = content.canon$({object:true}).name

    load_parent(args.parent, function (err, parent) {
      if (err) return done(err);

      cardent.load$(content.id, function (err, card) {
        if (err) return done(err);

        if (!card) {
          cardent.make$({
            id$: content.id,
            title: content.title,
            name: cardname,
            top: parent ? parent.top : content.id,
            parent: parent ? parent.id : null,
            children: []
          }).save$(function (err, card) {
            if (err) return done(err);

            update_parent(card, parent)
          });
        }
        else update_card(card, parent)
      })
    })

    function load_parent(parent, done) {
      if (parent) {
        cardent.load$(parent.id || parent, function (err, card) {
          if (err) return done(err);
          if (!card) return done(seneca.fail('parent-card-not-found', {id: parent.id || parent}));

          done(null, card);
        });
      }
      else {
        setImmediate(_.partial(done, null, null))
      }
    }

    function update_card(card, parent) {

      card.title = content.title
      card.name = cardname

      // TODO: @iantocristian review: does it make sense to update parent here?
      //  since we're not supporting move, parent should be immutable
      card.parent = parent && parent.id

      card.save$(function (err, card) {
        if (err) return done(err);

        update_parent(card, parent)
      })
    }

    function update_parent(card, parent) {
      if (parent) {
      // TODO: @iantocristian review: card.id === parent.id, does this really happen
        if( card.id !== parent.id ) {
          parent.children.push(card.id)
          parent.children = _.uniq(parent.children)
        }

        parent.save$(function (err) {
          if (err) return done(err);

          done(null, {content: content, card: card})
        })
      }
      else { // top cards have no parent, we don't mind
        return done(null, {content: content, card: card});
      }
    }
    
  }



  function cmd_unrelate(args, done) {
    var seneca = this

    var cardent = seneca.make('card/card')

    var content = args.ent
    var cardname = content.canon$({object: true}).name

    cardent.load$(content.id, function (err, card) {
      if (err) return done(err);
      if (!card) return done(seneca.fail('card-not-found', {id: content.id}));

      var parentid = card.parent

      if (!parentid) {
        card.remove$(done)
      }
      else {
        cardent.load$(parentid, function (err, parentcard) {
          if (err) return done(err);
          if (!parentcard) return done(seneca.fail('parent-card-not-found', {id: parentid}));

          parentcard.children = _.filter(parentcard.children, function (child) {
            return child !== content.id
          })

          parentcard.save$(function (err) {
            if (err) return done(err);

            card.remove$(done)
          })
        })
      }
    })
  }



  function card_save(args, done) {
    var seneca = this

    var parent = args.ent.parent

    if (null === args.ent.title) {
      args.ent.title = nid()
    }

    if ('card' !== args.name) {
      delete args.ent.top
      delete args.ent.parent
      delete args.ent.children
    }

    if (seneca.has('role:entity,base:card,cmd:save')) {
      return seneca.prior(args, after);
    }
    else {
      delete args.actid$
      delete args.base
      return seneca.act(args, after);
    }

    function after(err, content) {
      if (err) return done(err);

      if ('card' !== args.name) {
        seneca.act(
          {role: plugin, cmd: 'relate', ent: content, parent: parent},
          function (err, out) {
            if (err) return done(err);

            out.content.children = out.card.children

            // TODO: @iantocristian review: do we need to set parent to self for top (root) cards?
            out.content.parent = parent ? parent.id : out.content.id
            out.content.top = parent ? parent.top : out.content.id

            return done(null, out.content)
          })
      }
      else return done(null, content)
    }
  }



  function card_load(args, done) {
    var seneca = this

    var cardent = seneca.make('card/card')

    if (seneca.has('role:entity,base:card,cmd:load')) {
      return seneca.prior(args, after);
    }
    else {
      delete args.actid$
      delete args.base
      return seneca.act(args, after);
    }

    function after(err, content) {
      if (err) return done(err);
      if (!content) return done();

      if ('card' !== args.name) {
        cardent.load$(content.id, function (err, card) {
          if (err) return done(err);
          if (!card) return done(seneca.fail('card-not-found', {id: content.id}));

          content.parent = card.parent
          content.children = card.children
          content.top = card.top

          return done(null, content);
        })
      }
      else return done(null, content);
    }
  }



  function card_remove(args, done) {
    var seneca = this

    var load = _.isUndefined(args.q.load$) ? true : args.q.load$ // default true

    // only removes first matching card unless all$ is set
    var all  = args.q.all$ // default false

    var listargs = _.clone(args)
    listargs.cmd = 'list'

    // load cards
    seneca.act(listargs, function(err,list) {
      if( err ) return done(err);

      list = all ? list : 0<list.length ? list.slice(0,1) : []

      async.series([
        // remove children
        _.bind(async.eachLimit, async, list, options.removeLimit, remove_children),
        // unrelate cards first
        _.bind(async.eachLimit, async, list, options.removeLimit, unrelate),
        // act remove
        remove
        // finally
      ], complete)

      function complete(err) {
        if( err ) return done(err);
        var ent = all ? null : load ? list[0] || null : null

        done(null,ent)
      }
    })

    function remove_children(ent, cb) {
      if( 'card' !== args.name ) {
        seneca.act('role:card,cmd:children', {card: ent}, function (err, children) {
          if (err) { return cb(err) }

          async.eachLimit(children.children, options.removeLimit, function (child, done) {
            var childent = seneca.make$('card/' + child.name);
            childent.remove$({id: child.id}, done)
          }, cb)
        })
      }
      else return cb();
    }

    function unrelate(ent, cb) {
      if( 'card' !== args.name ) {
        seneca.act(
          {role:plugin,cmd:'unrelate',ent:ent},
          cb)
      }
      else return cb();
    }

    function remove(cb) {
      if( seneca.has('role:entity,base:card,cmd:remove') ) {
        return seneca.prior( args, cb );
      }
      else {
        delete args.actid$
        delete args.base

        return seneca.act( args, cb );
      }
    }
  }



  seneca.add({init:plugin}, function( args, done ){
    var seneca = this

    seneca.act('role:util, cmd:define_sys_entity', {list:[
      'card/card'
    ]})

    done()
  })


  return {
    name: plugin
  }
}
