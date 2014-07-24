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

        console.log(top)

        assert.equal(top.id,top.parent)
        assert.equal(0,top.children.length)


        si.make$(
          'card/note',
          {parent:top,text:'note0'}

        ).save$(function(err,note0){

          si.make$(
            'card/img',
            {parent:top,title:'Image',caption:'img 0',data:'abcdef'}

          ).save$(function(err,img0){

            si.act('role:card,cmd:children',{card:top},console.log)

            // title, parent, children fields in card/card
            // card/note contains text
            si.act('role:mem-store,cmd:dump',function(err,out){
              console.log(util.inspect(out,{depth:null}))
              fin()
            })
          })
        })
      })
  })

})

