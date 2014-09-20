/* Copyright (c) 2014 Richard Rodger */
"use strict";

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


    function maketop(cb) {
      si.act(
        'role:card,make:top', {
          title:'Course 0'
        },
        function(err,top) {
          if (err) return cb(err)

          assert.equal(top.id, top.parent)
          assert.equal(0, top.children.length)

          cb(null, top);
        }
      )
    }

    function makenote(top, cb) {
      var note = si.make$('card/note', {parent: top, text: 'note0'})
      note.save$(function (err, note0) {
        if(err) return cb(err);

        assert.equal(top.id,note0.parent)
        assert.equal(0,note0.children.length)

        cb(null, note0, top)
      })
    }

    function makeimg(note0, top, cb) {
      var img = si.make$('card/img', {parent:note0,title:'Image',caption:'img 0',data:'abcdef'})
      img.save$(function (err, img0) {
        if(err) return cb(err);

        assert.equal(note0.id,img0.parent)
        assert.equal(0,img0.children.length)

        cb(null, img0, note0, top)
      })
    }

    function verifychildren(img0, note0, top, cb) {
      async.series([
        _.partial(isfirstchild, top, note0),
        _.partial(isfirstchild, note0, img0),
        _.partial(hasnochildren, img0)
      ], makecb(Array.prototype.slice.call(arguments)))
    }

    function removenote(img0, note0, top, cb) {
      async.series([
        _.bind(note0.remove$, note0, {id:note0.id}),
        _.partial(hasnochildren, top)
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
  
  it('happy', function(fin) {
    si.act(
      'role:card,make:top',{
        title:'Course 0'
      },
      function(err,top){
        if(err) return fin(err);

        assert.equal(top.id,top.parent)
        assert.equal(0,top.children.length)

      ;si.make$(
        'card/note',
        {parent:top,text:'note0'}

      ).save$(function(err,note0){
        if(err) return fin(err);

        assert.equal(top.id,note0.parent)
        assert.equal(0,note0.children.length)

      ;si.make$(
          'card/img',
          {parent:note0,title:'Image',caption:'img 0',data:'abcdef'}
        
      ).save$(function(err,img0){
        if(err) return fin(err);

        assert.equal(note0.id,img0.parent)
        assert.equal(0,img0.children.length)
        
      ;si.act('role:card,cmd:children',{card:top},function(err,out){
        if(err) return fin(err);
        assert.equal(out.children[0].id,note0.id)

      ;si.act('role:card,cmd:children',{card:note0},function(err,out){
        if(err) return fin(err);
        assert.equal(out.children[0].id,img0.id)

      ;si.act('role:card,cmd:children',{card:img0},function(err,out){
        if(err) return fin(err);
        assert.equal(out.children.length,0)

      ;si.act('role:mem-store,cmd:dump',function(err,out){
        if(err) return fin(err);
        console.log(util.inspect(out,{depth:null}))

      ;note0.remove$({id:note0.id},function(err){
        if(err) return fin(err);

      ;si.act('role:mem-store,cmd:dump',function(err,out){
        if(err) return fin(err);
        console.log(util.inspect(out,{depth:null}))
        fin()

      }) }) }) }) }) }) }) }) })
  })

})

