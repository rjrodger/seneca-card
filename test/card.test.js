/* Copyright (c) 2014 Richard Rodger */
'use strict';

// mocha card.test.js

var _ = require('underscore')
var util = require('util')
var async = require('async')

var seneca  = require('seneca')

var assert  = require('assert')

var si = seneca()
si.use( '../card' )



describe('card', function() {


  function makecb(args) {
    var done = args.pop()
    var cb = function(err) {
      args.unshift(err)
      done.apply(this, args)
    }
    return cb
  }

  function memdump() {
    function dump(cb) {
      si.act('role:mem-store,cmd:dump',function(err,out) {
        if (err) return cb(err);
        console.log(util.inspect(out, {depth: null}))
        cb()
      })
    }
    dump(makecb(Array.prototype.slice.call(arguments)))
  }


  it('happier', function(fin) {

    async.waterfall([
      function(cb) { cb(null, {}) },
      maketop,
      memdump,
      makenote,
      memdump,
      makeimg,
      memdump,
      verifychildren,
      removenote,
      memdump
    ], function() {
      fin();
    })


    function maketop(ctx, cb) {
      si.act(
        'role:card,make:top', {
          title:'Course 0'
        },
        function(err,top) {
          if (err) return cb(err)

          assert.equal(top.id, top.parent)
          assert.equal(top.id, top.top)
          assert.equal(0, top.children.length)

          ctx.top = top

          cb(null, ctx)
        }
      )
    }

    function makenote(ctx, cb) {
      var note = si.make$('card/note', {parent: ctx.top, text: 'note0'})
      note.save$(function (err, note0) {
        if(err) return cb(err);

        assert.equal(ctx.top.id,note0.parent)
        assert.equal(ctx.top.id,note0.top)
        assert.equal(0,note0.children.length)

        ctx.note0 = note0

        cb(null, ctx)
      })
    }

    function makeimg(ctx, cb) {
      var img = si.make$('card/img', {parent:ctx.note0,title:'Image',caption:'img 0',data:'abcdef'})
      img.save$(function (err, img0) {
        if(err) return cb(err);

        assert.equal(ctx.note0.id,img0.parent)
        assert.equal(ctx.top.id,img0.top)
        assert.equal(0,img0.children.length)

        ctx.img0 = img0

        cb(null, ctx)
      })
    }

    function verifychildren(ctx, cb) {
      async.series([
        _.partial(isfirstchild, ctx.top, ctx.note0),
        _.partial(isfirstchild, ctx.note0, ctx.img0),
        _.partial(hasnochildren, ctx.img0)
      ], makecb(Array.prototype.slice.call(arguments)))
    }

    function removenote(ctx, cb) {
      async.series([
        _.bind(ctx.note0.remove$, ctx.note0, {id:ctx.note0.id}),
        _.partial(hasnochildren, ctx.top)
      ], makecb(Array.prototype.slice.call(arguments)))
    }



    function isfirstchild(parent, child, cb) {
      si.act('role:card,cmd:children',{card:parent},function(err,out) {
        if (err) return cb(err);
        assert.equal(out.children[0].id, child.id)
        cb()
      })
    }

    function hasnochildren(parent, cb) {
      si.act('role:card,cmd:children',{card:parent},function(err,out) {
        if (err) return cb(err);
        assert.equal(out.children.length,0)
        cb()
      })
    }

  })

})

