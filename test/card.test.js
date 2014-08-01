/* Copyright (c) 2014 Richard Rodger */
"use strict";

// mocha card.test.js

var util = require('util')

var seneca  = require('seneca')

var assert  = require('assert')

var si = seneca()
si.use( '../card' )



describe('card', function() {
  
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

