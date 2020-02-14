(function(root, factory){

  'use strict';

  // If you want to bind to an other namespace,
  // please change this value.
  // For example, `underxcore`, `xepto` or something else.
  var namespace   = 'FM';

  // Exposure!!
  ;((typeof exports) === "object" && (typeof module) === "object")
    ? (module.exports = factory())
    : (
      (typeof define === "function" && define.amd)
        ? define([], factory)
        : (root[namespace] = factory())
      );

})(this, function($){

  function FMJS(){}
  function FMJS_Component(){}

  FMJS.prototype.ins = function(i){
    return new FMJS_Component(i);
  }

  var _ = new FMJS;

  var Cache = {
    'event_target': [],
    'event_holder': []
  };

  _.config = {
    promise: FM_Promise
  };


  // Prepare.
  _.ar = _.ins(); // Array
  _.vr = _.ins(); // Variable
  _.nm = _.ins(); // Number
  _.st = _.ins(); // String
  _.fn = _.ins(); // Functon
  _.ob = _.ins(); // Object

  // ------ Options ------ //
  _.async = _.ins();
  // Math
  _.math = _.ins();
  // File
  _.file = _.ins();
  // Event
  _.event = _.ins();
  // Time
  _.time = _.ins();
  // Date
  _.date = _.ins();
  // URI
  _.uri = _.ins();
  // dom
  _.dom = _.ins();
  // HTML
  _.html = _.ins();
  // RegExp
  _.regexp = _.ins();


  /*------------------------
   * Constructors
   *------------------------
   *
   * FM_...
   *
   */

  /* FM_Error
   * ( String
   * )
   */
  function FM_Error(message){
    try{
      throw new Error("FM_Error: " + message);
    }catch(e){
      this.origin = e;
      this.message = (e.message) ? e.message : "";
      if(e.stack){
        var et = _.vr.type(e.stack);
        switch(et){
          case 'string':
            var s = _.st.split(e.stack);
            this.stack = s.reduce(function(m, v){
              var mt = v.match(/(\/\/.*\.js):([0-9]+):([0-9]+)/);
              var d = {
                file: "",
                line: 0,
                column: 0,
                origin: v
              };
              if(mt){
                d.file = mt[1];
                d.line = _.vr.to_integer(mt[2]);
                d.column = _.vr.to_integer(mt[3]);
              }
              m.push(d);
              return m;
            }, []);
            break;
          default:
            this.stack = e.stack;
            break;
        }
      }else{
        this.stack = [];
      }
    }
  }

  function raise(message){
    throw new FM_Error(message);
  }


  function FM_Storage(c){
    this.storage = c;
  }

  FM_Storage.prototype.set = function(k, v){
    if(_.ob.has(this.storage, k)){
      this.storage[k] = v;
      return v;
    }
    return false;
  }
  FM_Storage.prototype.get = function(k){
    if(_.ob.has(this.storage, k)){
      return this.storage[k];
    }
    return null;
  }


  function FM_Promise(process){
    // Privates.
    var queue    = {'resolved': [], 'rejected': [], 'finally': []};
    var state    = undefined;
    var previous = undefined;
    var trigger  = undefined;
    var self = this;

    function flush(){
      _f(state);
      (queue['finally'].length) && _f('finally');
      reset();
    }

    function _f(s){
      for(var i = 0; i < queue[s].length; i++){
        previous = _.vr.is_f(queue[s][i])
                 ? queue[s][i].apply(null, [previous, trigger])
                 : queue[s][i];
      }
    }

    function reset(){
      queue.resolved = [];
      queue.rejected = [];
      queue.finally = [];
    }

    self.state = function(){
      return state;
    };

    self.then = function(callback, error){
      (callback) && queue['resolved'].push(callback);
      (error) && self.catch(error);
      (state == 'resolved') && flush();
      return self;
    };

    self.catch = function(callback){
      (callback) && queue['rejected'].push(callback);
      (state == 'rejected') && flush();
      return self;
    };

    self.always = function(callback){
      self.then(callback, callback);
      return self;
    };

    self.finally = function(callback){
      (callback) && queue['finally'].push(callback);
      (state == 'resolved' || state == 'rejectd') && flush();
      return self;
    };

    // resolve(), reject()
    [['resolve', 'resolved']
    ,['reject' , 'rejected']].map(function(tpl){
      self[tpl[0]] = function(r){
        if(state){
          console.error('Expired promise can not be triggered again.');
          return;
        };
        state = tpl[1];
        trigger = r;
        previous = trigger;
        flush();
      };
    });

    reset();
    (process) && (
      (_.vr.is_f(process))
        ? process(self.resolve, self.reject)
        : (function(){ self.resolve(process) })()
    );
  }

  FM_Promise.resolve = function(a){
    return new FM_Promise(function(rs){rs(a)});
  }

  FM_Promise.reject = function(a){
    return new FM_Promise(function(rs,rj){rj(a)});
  }


  function FM_Event(ename, c, p){
    var evs = ename.split('.');
    var evn = evs.shift();
    var evi = evs;

    this.id = ename;
    this.type = evn;
    this.namespace = evi;
    this.parameter = p ? p : {};

    this.handler = (c)
      ? (function(self){
          return function(e, p){
            self.origin = (e !== self) ? e : undefined;
            (c || function(){}).apply(self.target, [self, (p || self.parameter)]);
          }
        })(this)
      : function(){};
  }


  function FM_DOMQuery(){
    // I need Array prototype chain but,
    // I don't know how to identify constructor name
    // after instantiated the specific constructor.
    //
    // I hope this example returns false in this case...
    // FM_DOMQuery includes Array as prototype chain.
    // But I feel that $c can not be said 'instanceof FM_DOMQuery'.
    // var $c = new Array
    // console.log($c instanceof FM_DOMQuery)
    // >> true
    //
    this.FM_DOMQuery = true;
    (arguments.length) && Array.prototype.push.apply(this, Array.prototype.slice.call(arguments));
  }
  FM_DOMQuery.prototype = Array.prototype;


  function FM_Date(date){
    this.update(date);
  }

  FM_Date.prototype.format = [
    ["getDate"],
    ["getDay", function(v){
      this.weekday = this.weekday_list[v];
      return v;
    }],
    ["getFullYear", null, "year"],
    ["getHours"],
    // Fix Milli length
    ["getMilliseconds", function(v){ return parseInt(_.st.padr(v.toString(), '3', '0')) }],
    ["getMinutes"],
    // Fix month value to actually month number.
    ["getMonth", function(v){ return v + 1;}],
    ["getSeconds"],
    ["getTime"],
    ["getTimezoneOffset"],
    ["getUTCDate"],
    ["getUTCDay", function(v){
      this.utc_weekday = this.weekday_list[v];
      return v;
    }],
    ["getUTCFullYear", null, "utc_year"],
    ["getUTCHours"],
    // Fix Milli length
    ["getUTCMilliseconds", function(v){ return parseInt(_.st.padr(v.toString(), '3', '0')) }],
    ["getUTCMinutes"],
    // Fix month value to actually month number.
    ["getUTCMonth", function(v){ return v + 1;}],
    ["getUTCSeconds"],
    ["getYear", null, "year_diff"]
  ];

  FM_Date.prototype.weekday_list = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  FM_Date.prototype.update = function(date){
    var self = this;
    self.origin = date ? (date instanceof Date ? date : new Date(date)) : new Date;
    self.format.map(function(c){
      var k = c[0];
      var f = c[1];
      var kr = c[2] || k.replace(/^get/, '');
      var v = self.origin[k]();
      v = (f) ? f.call(self, v) : v;
      self[_.st.to_snake(kr)] = v;
    });
    return self;
  }
  // Can't access Date.prototype methods.
  // this is not a Date object.
  //FM_Date.prototype = Date.prototype;




  /* vr.type
   * ( a
   * ) -> String
   *
   * Available list of types...
   *
   * object
   * array
   * string
   * integer
   * float
   * function
   * boolean
   * symbol
   * undefined
   * null
   * NaN
   * Infinity
   *
   * More specified types.
   *
   * Nan  -> 'NaN'
   * 1.2  -> 'float'
   * 1    -> 'integer'
   * [1]  -> 'array'
   * null -> 'null'
   */
  _.vr.type = function(v){
    // No doubt.
    if(v === NaN) return 'NaN';
    if(v === Infinity) return 'Infinity';
    if(v === undefined) return 'undefined';
    if(v === null) return 'null';

    var t = typeof v;
    switch(t){
      case 'number':
        var vi = parseInt(v);
        if((vi === v || vi === (v*-1))) return 'integer';
        if(Math.floor(v) !== v) return 'float';
        break;
      case 'object':
        // I don't use toString.apply() because
        // I want to support prototype-chain like below.
        // function A(){} A.prototype = Array.prototype
        // Anyway, I feel that javascript needs -
        // 'precise' constructor validator.
        if(v instanceof Array)
          return 'array';
        if(v instanceof FM_Promise || v instanceof _.config.promise || (Promise && v instanceof Promise))
          return 'promise';
        break;
      case 'function':
        if(v.constructor.name === "AsyncFunction")
          return 'asyncf';
        break;
      case 'string':
      case 'boolean':
      case 'symbol':
      default:
        break;
    }

    return t;
  }

  /* vr.is_empty
   * ( a
   * ) -> Boolean
   *
   * Return 'a' is empty or not (In my opinion.)
   */
  _.vr.is_empty = function(a){
    return (
      _.vr.is_void(a) || a === 0 || a === '' || a === NaN || a === false
      || (_.vr.is_a(a) && a.length === 0)
      || (_.vr.is_o(a) && _.ob.keys(a).length === 0 /* && a.constructor.name === 'Object' */)
      || (_.vr.is_f(a) && !!a.toString().match(/^function\s?\(\)\s{0,}\{\s{0,}\}$/))
    );
  }

  /* vr.is_not_empty
   * ( a
   * ) -> Boolean
   *
   * Returns !vr.is_empty(v)
   */
  _.vr.is_not_empty = function(a){
    return !_.vr.is_empty(a);
  }

  /* vr.is_void
   * ( a
   * ) -> Boolean
   *
   * Returns var is 'void'.
   * This is not same as 'void' operator in ECMA.
   *
   * This should return...
   * "Primitive values which don't have any referencable properties or constructor."
   *
   */
  _.vr.is_void = function(v){
    return v === null || v === undefined;
  }

  /* vr.valid
   * ( a
   *   String : vr.type results.
   * ) -> Boolean
   *
   * # Absolutely, no.
   * valid('123', 'integer')
   * // Is '123' an integer ?
   * > false
   *
   * # Detailed type check
   * valid([1,2,3], 'array')
   * // Is [1,2,3] an array ?
   * > true
   *
   * # Default typeof behavior
   * valid([1,2,3], 'object')
   * // Is [1,2,3] an object?
   * > true
   *
   * # OR
   * valid(1.5, ['float','integer'])
   * // Is 1.5 in float or integer ?
   * > true
   *
   * # Instance and Constructor validation.
   * var n = new Number(2);
   * valid(n, Number);
   * // Is `n` an instanceof Number ?
   * > true
   *
   */
  _.vr.valid = function(val, type){
    var t = _.vr.type(val);
    var s = _.vr.type(type);
    var rf = { // Reverse references.
      'integer': 'number',
      'float'  : 'number',
      'array'  : 'object',
      'asyncf' : 'function',
      'promise': 'object'
    };
    switch(s){
      case 'function':
        return (val instanceof type);
      case 'array':
        return type.filter(function(v){
          return (_.vr.valid(val, v));
        }).length > 0;
      case 'string':
        return (_.ob.has(rf, t))
             ? (t === type || rf[t] === type)
             : (t === type) ;
      case 'float':
      case 'integer':
        return val === type;
      default:
        return false;
    }
  }

  /* vr.cast
   * ( a
   *   String = from ['array','object','integer','function','string']
   * ) -> b
   *
   * Returns casted value.
   * vr.'to_' + type method should exist to call vr.cast.
   *
   * @throws FM_Error
   *
   */
  _.vr.cast = function(v, type){
    if(_.vr.valid(v, type)){
      return v;
    }else{
      var m = 'to_' + type;
      var vt = _.vr.type(v);
      if(_ob.has(_.vr, m)){
        return _.vr[m](v);
      }else{
        raise("vr.cast: Failed to cast " + vt + " to " + type + ". There is no available vr.to_"+type+"() method.");
      }
    }
  }

  /* vr.is_f
   * ( a
   * ) -> Boolean
   *
   * Return a is function or not.
   */
  _.vr.is_function = _.vr.is_f = function(v){
    return _.vr.valid(v, 'function');
  }
  // array
  _.vr.is_array = _.vr.is_a = function(v){
    return _.vr.valid(v, 'array');
  }
  // object
  _.vr.is_object = _.vr.is_o = function(v){
    return _.vr.type(v) === 'object';
  }
  // string
  _.vr.is_string = _.vr.is_s = function(v){
    return _.vr.valid(v, 'string');
  }
  // integer
  _.vr.is_integer = _.vr.is_i = function(v){
    return _.vr.valid(v, 'integer');
  }
  // async
  _.vr.is_asyncf = _.vr.is_af = function(v){
    return _.vr.valid(v, 'asyncf');
  }
  // promise
  _.vr.is_promise = _.vr.is_pr = function(v){
    return _.vr.valid(v, 'promise');
  }

  // boolean
  _.vr.is_boolean = _.vr.is_b = function(v){
    return _.vr.valid(v, 'boolean');
  }

  /* vr.to_string
   * ( a
   * ) -> String
   */
  _.vr.to_string = _.vr.to_s = function(v){
    var vt =_.vr.type(v);
    switch(vt){
      case 'string':
        return v;
      case 'array':
      case 'object':
        return _.vr.stringify(v);
      default:
        return v != null && v != undefined && v.toString
          ? v.toString()
          : (_.vr.is_empty(v) ? "" : v + "");
    }
  }

  _.vr.to_integer = _.vr.to_i = function(v){
    var vt =_.vr.type(v);
    switch(vt){
      case 'integer':
        return v;
      case 'object':
        return _.ob.keys(v).length;
      case 'string':
        return (_.st.is_maybe_integer(v) || _.st.is_maybe_float(v))
             ? parseInt(v)
             : parseInt(v.replace(/[^0-9]/g, ""))
      case 'array':
        return v.length;
      case 'float':
        return parseInt(v);
      default:
        return (_.vr.is_empty(v)) ? 0 : parseInt(v);
    }
  }

  _.vr.to_array = _.vr.to_a = function(v){
    var vt =_.vr.type(v);
    switch(vt){
      case 'array':
        return v;
      case 'object':
        var m = [];
        _.ob.each(v, function(k, v){
          m.push(v);
        });
        return m;
      default:
        return (_.vr.is_empty(v)) ? [] : [v];
    }
  }

  _.vr.to_object = _.vr.to_o = function(v){
    var vt =_.vr.type(v);
    switch(vt){
      case 'object':
        return v;
      case 'array':
        return v.reduce(function(m, n, i){ m[i] = n; return m; }, {});
      default:
        return (_.vr.is_void(v) ? {} : (v.constructor ? new v.constructor(v) : {}));
    }
  }

  _.vr.to_function = _.vr.to_f = function(v){
    var vt =_.vr.type(v);
    switch(vt){
      case 'function':
        return v;
      default:
        return function(){ return v; };
    }
  }

  _.vr.stringify = function(v){
    var rep = function(){
      var cache = [];
      return (k, v) => {
        if (typeof v === "object" && v !== null) {
          if(cache.indexOf(v) >= 0) {
            return '[circular ' + (v.constructor ? v.constructor.name : typeof v) + ']';
          }
          cache.push(v);
        }
        return v;
      };
    };
    if(v instanceof Error){
      var sur = {};
      sur.message = v.message;
      sur.stack = v.stack.split("\n").map(function(r){ return r.trim(); });
      v = sur;
    }
    if(JSON){
      return JSON.stringify(v, rep());
    }else{
      if(v.toString){
        return v.toString();
      }
      return typeof v;
    }
  }


  //------------------------------------------------
  // #Object
  //------------------------------------------------

  /* ob.valid
   * ( Object
   *   Object = Validator
   *   Boolean = Strict flag. Validates diffs between an object and Validator if true.
   * )
   */
  _.ob.valid = function(o, vl, strict){
    var ok = _.ob.keys(o), vlk = _.ob.keys(vl), ks = _.ar.unique(_.ar.concat(ok, vlk));
    return (
         (!strict || (_.ar.diff(ks, ok).length === 0 && _.ar.diff(ks, vlk).length === 0))
      &&
      ks.filter(function(k){
        var oke = _.ob.has(o, k), vlke = _.ob.has(vl, k);
        return (oke && vlke) ? _.vr.valid(o[k], vl[k]) : (strict ? false : true);
      }).length === ks.length
    );
  }

  /* ob.merge
   * ( Object
   *   ...
   * ) -> Object
   *
   * Merge objects recursively.
   */
  _.ob.merge = function(/* Object, Object, Object, ... */){
    var a = _.ar.clone(arguments), or = a.shift();
    return a.reduce(_.ob.combine, or);
  }

  /* ob.include
   * ( Object
   *   Array = [Function...]. "Function"s should be named-function.
   * ) -> Object
   *
   * apply fn.pack to a specific object.
   */
  _.ob.include = function(ob, fns){
    return _.ob.merge(ob, _.fn.pack(fns));
  }

  /* ob.combine
   * ( Object
   *   Object
   * ) -> Object
   *
   * Merge object to object.
   *
   */
  _.ob.combine = function(m, o){
    (o && _.vr.is_o(o))
      && _.ob.each(o, function(k, v){
        _.ob.assign(m, k, v);
      });
    return m;
  }

  /* object.assign
   * ( Object
   *   String : Key
   *   a : Value
   * ) -> Object
   *
   * !! Has interdependency with ob.merge !!
   *
   * Assign properties to Object.
   *
   */
  _.ob.assign = function(o, k, v){
    if(_.vr.is_o(v)){
      (!_.ob.has(o, k)) && _.ob.prop(o, k, {});
      o[k] = (_.vr.is_o(o[k]))
           ? _.ob.merge(o[k], v)
           : v;
    }else{
      _.ob.prop(o, k, v);
    }
    return o;
  }

  /* object.thaw
   * ( Object
   *   Array | String
   *   Any = default value for failed.
   * ) -> a
   *
   * _.ob.thaw({a: {b: 1}}, 'a.b');
   * _.ob.thaw({a: {b: 1}}, ['a', 'b']);
   *
   * Both will return `1`
   *
   */
  _.ob.thaw = function(o, ref, fail){
    return (ref)
      ? (function(){
          var s = _.vr.is_a(ref) ? ref : ref.split(".")
            , k = s.shift();
          return (_.ob.has(o, k))
            ? (s.length > 0 ? _.ob.thaw(o[k], s, fail) : o[k])
            : fail;
        })()
      : fail;
  }
  _.ob.dig = _.ob.thaw;

  /* object.keys
   * ( Object
   * ) -> Array
   *
   * Return Object keys as Array.
   */
  _.ob.keys = function(o){
    var k = [];
    _.ob.each(o, function(p, v){
      k.push(p);
    });
    return k;
  }

  /* ob.prop
   * ( Object
   *   String : Key
   *   a : Value
   *   [Object]
   * ) -> Object
   *
   * Made of origin.
   */
  _.ob.prop = function(o, k, v, conf){
    var c = _.vr.is_o(conf) ? conf : {};
    Object.defineProperty(o, k, {
      value: v,
      enumerable: _.ob.has(c, 'enumerable') ? c.enumerable : true,
      configurable: _.ob.has(c, 'configurable') ? c.configurable : true,
      writable: _.ob.has(c, 'writable') ? c.writable : true });
    return o;
  }

  /* ob.define
   * ( Object = Defaults
   * ) -> Function(
   *        Object = Overrides
   *      )
   */
  _.ob.define = function(def){
    return function(o){
      return _.ob.merge({}, def, o);
    }
  }

  /* object_pick
   * ( Object
   *   Array = Property name list
   * ) -> Object
   *
   * Pick object properties with keys.
   */
  _.ob.pick = function(o, ks){
    var ret = {};
    _.ar.map(ks, function(k){
      (_.ob.has(o,k)) && (ret[k] = o[k]);
    });
    return ret;
  }

  /* ob.has
   * ( Object
   *   String = Property name
   * ) -> Boolean
   */
  _.ob.has = function(o, k){
    return (_.vr.is_o(o)) && Object.prototype.hasOwnProperty.call(o, k);
  }

  /* ob.know
   * ( Object
   *   String = Property name
   * ) -> Boolean
   *
   */
  _.ob.know = function(o, k){
    return typeof o[k] !== 'undefined';
  }

  /* ob.each
   * ( Object
   *   Function(
   *     String = Property name
   *     a      = Value
   *     Object = self
   *   )
   * ) -> Object
   */
  _.ob.each = function(o, c){
    for(var k in o){
      c(k, o[k], o);
    }
    return o;
  }

  /* ob.filter
   * ( Object
   *   Function(
   *     String = Property name
   *     a      = Value
   *     Object = self
   *   )
   * ) -> Object
   *
   * Filtering Object with keys.
   */
  _.ob.filter = function(o, c){
    var ret = {};
    _.ob.each(o, function(k, v, r){ c(k, v, r) && (ret[k] = v); });
    return ret;
  }

  /* ob.diff
   * ( Object
   *   Object
   * ) -> Object
   */
  _.ob.diff = function(){
    var args = _.ar.clone(arguments);
    var a = args.shift();
    var b = args.shift();
    var a_k = _.ob.keys(a);
    var b_k = _.ob.keys(b);
    var diff = {};
    var ks = a_k.concat(b_k);
    _.ar.map(ks, function(k){
      if(_.ob.has(a, k) && _.ob.has(b, k)){
        var ta = _.vr.type(a[k]);
        var tb = _.vr.type(b[k]);

        if(ta === tb){
          if(ta === 'object'){
            diff[k] = _.ob.diff(a[k], b[k]);
          }else{
            if(a[k] !== b[k])
              diff[k] = b[k];
          }
        }else{
          diff[k] = b[k];
        }
      }else if(_.ob.has(a, k)){
        diff[k] = a[k];
      }else if(_.ob.has(b, k)){
        diff[k] = b[k];
      }
    });
    if(args.length){
      return _.ob.merge(diff, _.ob.diff.apply(null, [diff].concat(args)));
    }else{
      return diff;
    }
  }

  /* ob.construct
   * ( Function = Constructor
   *   Array =-Arguments
   *   ?Object = Context
   * ) -> Object
   *
   * Bit different to fn.construct().
   * This method makes object by "classic" way.
   *
   */
  _.ob.construct = function(constructor, args, context){
    function FM_Instance(){
      return constructor.apply(context || this, _.vr.is_a(args) ? args : [args]);
    }
    FM_Instance.prototype = constructor.prototype;
    return new FM_Instance();
  }

  _.ob.stringify = function(o){
    return _.vr.stringify(o);
  }

  /* ob.serialize
   * ( Object
   *   ?String = ""  # Set when you want mimic key depth.
   * ) -> Array
   *
   */
  _.ob.serialize = function(o, stack){
    var is_o = _.vr.is_o(o);
    if(!is_o && !_.vr.is_a(o)) return o;
    var part = [];
    for(var i in o){
      var v = o[i];
      var k = (stack
          ? stack[0] + (stack.length > 1 ?'['+stack.slice(1).join('][')+']' : '') + (is_o ? '[' + i + ']': '[]')
          : i);
      switch(_.vr.type(v)){
        // Concatenate key strings.
        case 'array':
          _.ar.each(v, function(n, ai){
            if(_.vr.is_a(n))
              part.push.apply(part, _.ob.serialize(n, !stack ? [i, ai] : stack.concat(i, ai), true));
            else if(_.vr.is_o(n))
              part.push.apply(part, _.ob.serialize(n, !stack ? [i, ai] : stack.concat(i, ai), true));
            else
              part.push([k + '[]', n]);
          });
          break;
        case 'object':
          part.push.apply(part, _.ob.serialize(v, !stack ? [i] : stack.concat(i)));
          break;
        default:
          part.push([k, v]);
          break;
      }
    }
    return part;
  }

  /* ob.unserialize
   * ( Array = Results of ob.serialize
   *   ?Object = Destination object.
   *   ?Function = Filter
   *   (
   *     String
   *     a
   *   )
   * )
   *
   */
  _.ob.unserialize = function(serialized, obj, filter){
    var ret = obj || {};
    // data[some][thing] -> data, some, [thing]

    _.ar.each(serialized, function(c){
      c = (filter) ? filter(c) : c;
      var k = c[0];
      var v = c[1];
      var f = _.ar.filter(k.replace(/^\[/, '').split('['), function(n){ return n !== ''; });
      var basekey = ((f.length > 0) ? f[0] : k).replace(/[\[\]]/g, '');
      var nextkey = f.slice(1).reduce(function(m, n){
        return m + '[' + n.replace(/[\[\]]/g, '') + ']';
      }, '');

      if(!basekey) return;

      // Numbered properties
      basekey = (basekey.match(/^[0-9]+$/)) ? parseInt(basekey) : basekey;

      // Force conversion to base reference.
      if(_.vr.is_i(basekey) && _.vr.is_o(ret) && _.ob.keys(ret).length === 0){
        ret = [];
      }else if(_.vr.is_s(basekey) && _.vr.is_a(ret) && ret.length === 0){
        ret = {}
      }

      if(!ret[basekey]){
        ret[basekey] = (nextkey == '[]') ? [] : '';
      }

      // data[some][thing]
      if(nextkey && nextkey !== '[]'){
        ret[basekey]
          = (nextkey.match(/(\[([^\[\]]*)\])/))
            ? _.ob.unserialize([[nextkey, v]], ret[basekey])
            : ret[basekey];
      }else{
        v = (_.vr.is_s(v))
            ? ((_.st.is_maybe_float(v))
              ? parseFloat(v)
              : (_.st.is_maybe_integer(v)
                  ? parseInt(v)
                  : v))
            : v;
        if(nextkey === '[]'){
          (_.vr.is_a(ret[basekey]))
            ? ret[basekey].push(v)
            : (_.vr.is_o(ret[basekey])
                ? (ret[basekey][_.ob.keys(ret[basekey]).length] = v)
                : null);
        }else{
          ret[basekey] = v;
        }
      }
    });
    return ret;
  }




  //------------------------------------------------
  // #Array
  //------------------------------------------------

  /* ar.valid
   * ( Array = [a]          # Array of values
   *   Array = [String...]  # Array of types
   * ) -> Boolean
   *
   * Apply valid() to all passed values.
   *
   * _.ar.valid([1, 2, 3], 'integer');
   * > true
   *
   * _.ar.valid([1, 'hoge', 3], 'integer');
   * > false
   *
   * _.ar.valid(['hoge', {foo:3}, 4], ['string', 'object', 'integer'])
   * > true
   *
   */
  _.ar.valid = function(vals, types){
    var v = (!_.vr.is_a(vals) ? [vals] : vals);
    var t = (!_.vr.is_a(types) ? [types] : types);
    return v.filter(function(v, i){
      return (t.length === 1)
        ? _.vr.valid(v, t[0])
        : (t[i] && _.vr.valid(v, t[i]));
    }).length === v.length;
  }


  /* ar.unique
   * ( Array = Source array.
   * ) -> Array
   */
  _.ar.unique = function(a){
    return a.reduce(function(m, v){
      !_.ar.has(m, v) && m.push(v);
      return m;
    }, []);
  }

  /* ar.map
   * ( Array
   *   Function(
   *     a       = Value
   *     Integer = Index
   *     Array   = self
   *   )
   * ) -> Array
   *
   * Bit faster than Array.map.
   *
   */
  _.ar.map = function(a, f){
    var i = -1, l = a.length, r = Array(a.length);
    while(++i < l) r[i] = f(a[i], i, a);
    return r;
  }

  /* ar.concat
   * ( Array...
   * ) -> Array
   *
   */
  _.ar.concat = function(){
    return _.ar.clone(arguments).reduce(function(m, a){
      return m.concat(a);
    }, []);
  }

  /* ar.repeat
   * ( Array
   *   Integer   # Repeating count
   * ) -> Array
   *
   */
  _.ar.repeat = function(v, len){
    return _.ar.map(Array.apply(null, new Array(len >= 0 ? len : 0)), function(){return v});
  }

  /* ar.range
   * ( Integer|String = From
   *   Integer|String = To
   * ) -> Array
   *
   * Make ranged array.
   *
   * ar.range(-2, 2)
   * >> [-2, -1, 0, ...]
   *
   * ar.range('a', 'z')
   * >> [a, b, c, d, ....]
   *
   * ar.range(1, 10, function(n){ return (2 * n) - 1 })
   * >> [1, 3, 5, 7, 9]
   *
   * ar.range(-10, 10, function(n){ return n * 3})
   * >> [-9, -6, -3, 0, 3, 6, 9]
   *
   */
  _.ar.range = function(i, ii, incr){
    var ret = [];
    var is_s = (_.vr.is_s(i) && _.vr.is_s(ii));
    var i = (is_s) ? i.charCodeAt(0) : i;
    var ii = (is_s) ? ii.charCodeAt(0) : ii;
    var d = s = r = i;
    var f = true, v = true;
    var ord = (i < ii);
    var fn = (_.vr.is_f(incr)) ? incr : false;
    var ir = (_.vr.is_i(incr)) ? incr : false;
    while(f){
      s = (fn
            ? fn(r)
            : (ir ? d + (incr * (r-d)) : r));
      f = (ord)
            ? (s <= ii && r <= ii)
            : (s >= ii && r >= ii);
      v = f && (ord ? (s >= i && r >= i) : (s <= i && r <= i));
      r = (ord) ? r + 1 : r - 1;
      (f && v) && ret.push(is_s ? String.fromCharCode(s) : s);
    }
    return ret;
  }

  /* ar.prime
   * ( Integer = 0 To X
   * ) -> Array
   *
   * Generate Prime list
   *
   */
  _.ar.prime = function(t){
    var m=[1],r=[];
    for(var i=1;i<=t;i++) r.push(i);
    for(var n=1;n<=t;n++)
      for(var i=2;i<=n;i++){if(i<n&&n%i==0){break;}if(i>n/2){m.push(n);break;}}
    return m;
  }

  /* ar.clone
   * ( Array
   * ) -> Array
   *
   * Clones an array.
   */
  _.ar.clone = function(a){
    return Array.prototype.slice.call(a);
  }

  /* ar.intersect
   * ( Array
   *   ...
   * ) -> Array
   *
   * ar.intersect([1,2,3], [2,3,4])
   * >> [2,3]
   */
  _.ar.intersect = function(){
    var ret = [], arg = _.ar.clone(arguments),
        a = arg.shift(), b = arg.shift();
    _.ar.each(a, function(na, ia){
      _.ar.has(b, na) && ret.push(na);
    });
    return (arg.length > 0) ? _.ar.intersect.apply(null, [ret].concat(arg)) : ret;
  }

  /* ar.diff
   * ( Array
   *   ...
   * ) -> Array
   *
   * Find differences among arrays.
   */
  _.ar.diff = function(/* a, a, a ... */){
    var d = [];
    return _.ar.clone(arguments).reduce(function(r, arg){
      return r.concat(arg).filter(function(v){
        var m = (!_.ar.has(r, v) || !_.ar.has(arg, v));
        (!m) && d.push(v);
        return (!_.ar.has(d, v) && m);
      });
    }, []);
  }

  /* ar.index
   * ( Array
   *   a
   *   ?Boolean = Flag for "get all index"
   * )
   */
  _.ar.index = function(a, n, all){
    var r = [];
    _.ar.each(a, function(v, i){
      if(n === v){
        r.push(i);
        if(!all) return false;
      }
    });
    return all ? r : (r.length ? r.shift() : false);
  }

  /* ar.has
   * ( Array
   *   a
   * ) -> Boolean
   *
   * Shorthand for a.indexOf(n) > -1
   */
  _.ar.has = function(a, n){
    return _.ar.index(a, n) !== false;
  }

  /* ar.sort
   * ( Array
   *   ?Function(
   *     a
   *     b
   *   )
   * ) -> Array
   *
   * sort(array, callback, order)
   *
   * array: sorting array.
   * callback: condition callback.
   * array: sorting array.
   *
   * ! This method is NOT fastest
   * to sort a simple list like...
   * [5,2,3,4,9]
   *
   * -- Sorter rules
   *
   *   true      -> Assigns to bigger.
   *   false     -> Assigns to smaller.
   *   undefined -> Ignores
   *   null      -> Ignores
   *   >0        -> Assigns to bigger.
   *   <0        -> Assigns to smaller
   *   else      -> Ignores
   *
   */
  _.ar.sort = function(a, fn){
    var f = _.vr.is_f(fn)
          ? fn
          : (fn || fn === undefined
              ? function(n,m){ return (n>m); }
              : function(n,m){ return (n<m); });
    return (!a.length || !_.vr.is_a(a))
      ? [] // edge
      : ((a.length === 1)
          ? a // edge
          : (function(){ // recur
              var em = [], bs = a[0], rm = a.slice(1),
                  sm = [], bg = [], r;
              _.ar.each(rm, function(v){
                r = f(v,bs);
                switch(true){
                  case r === 0:
                    sm.push(v);
                    break;
                  case r === true:
                    bg.push(v);
                    break;
                  case r === false:
                    sm.push(v);
                    break;
                  case r < 0:
                    sm.push(v);
                    break;
                  case r > 0:
                    bg.push(v);
                    break;
                }
              });
              return em.concat(_.ar.sort(sm, f), bs, _.ar.sort(bg, f));
            })());
  }

  /* ar.each
   * ( Array
   *   Function(
   *     a = Value
   *     Integer = Index
   *   ) = Callback
   *   ?Array   = Additional arguments.
   * ) -> Array
   *
   * In the callback...
   *   false     -> break
   *   null      -> continue
   *   undefined -> continue
   */
  _.ar.each = function(a, fn){
    if(_.vr.valid(fn, 'function')){
      for(var i=0; i<a.length; i++){
        var v = a[i];
        var f = fn.apply(v, [v, i]);
        if(f === false) break;
        if(f === null || f === undefined) continue;
      }
    }
    return a;
  }

  /* ar.filter
   * ( Array
   *   Function(
   *     a = Value
   *     Integer = Index
   *   )
   * ) -> Array
   */
  _.ar.filter = function(a, f){
    var ret = [];
    var df = f;
    var fn = _.vr.is_f(df) ? df : (df ? function(n){return n===df;} : function(n){return n;});
    _.ar.each(a, function(v, i){
      var r = fn.apply(v, [v, i]);
      (r) && ret.push(v);
    });
    return ret;
  }


  //------------------------------------------------
  // #String
  //------------------------------------------------

  /* st.repeat
   * ( String = Repeating strings
   *   Integer = Count
   * ) -> String
   *
   * Repeat string.
   */
  _.st.repeat = function(str, len){
    return _.ar.repeat(str, len).join("");
  }

  /* st.to_camel(
   *  String,
   *  ?String = Separater. default=/[\-_\.]/
   *  ?String = Glue string. default=''
   * )-> String
   *
   * !This function wont apply toLowerCase to continuous uppercases for compatibility with to_snake.
   *
   * FMJS_sample_function
   * => FMJSSampleFunction
   *
   */
  _.st.to_camel = function(str, separater, glue){
    return str.split(
      separater
        ? (_.vr.is_s(separater) ? _.regexp.create(separater, 'g') : separater)
        : /[\-_\.]/
    ).reduce(function(m, v){
      var chr = v.split('');
      var fst = chr.shift();
      return (
        fst
          ? (m
              ? (m + (glue||'') + fst.toUpperCase() + chr.join(''))
              : v
            )
          : m
      );
    }, "");
  }

  /* st.to_snake = (
   *  String
   *  ?String = Glue strings. default='_'
   * )-> String
   */
  _.st.to_snake = function(str, glue, keepc){
    var g = (glue||'_');
    return (function(f){
      return keepc ? f : f.toLowerCase();
    })(
      str
      // Something -> something
      .replace(/^([A-Z][a-z])/, function(n){ return n.toLowerCase(); })
      // SomeHTMLElement -> Some_HTMLElement
      .replace(/([^A-Z])([A-Z])/g, function(n, m, l){
        return m + (m == g ? '' : g) + l;
      })
      // HTMLElement -> HTML_Element
      .replace(/([A-Z])([A-Z][a-z])/g, function(n, m, l){
        return m + g + l;
      })
    );
  }

  /* st.fill
   * ( String
   *   Integer
   * ) -> String
   *
   * Return repeated-string filled with length.
   */
  _.st.fill = function(str, len){
    return _.ar.repeat(str, parseInt(len / str.length) + 1).join("").slice(0, len);
  }

  /* st.padding
   * ( String
   *   Integer
   *   ?String = Filling str. default=' '
   *   ?Boolean = true=Right, false=Left
   * ) -> String
   *
   * Padding string.
   * !lr -> Padding left
   * lr  -> Padding right
   */
  _.st.pad = function(str, len, pad, lr){
    var s = str + "";
    var l = len - s.length;
    var pd = _.st.repeat(
      pad.length ? pad : " ",
      l >= 0 ? l : 0
    );
    return ((!lr ? pd : '') + str + (lr ? pd : ''));
  }
  // Alias: string.pad(str, len, pad, 0)
  _.st.padl = function(str, len, pad){
    return _.st.pad(str, len, pad, 0);
  }
  // Alias: string.pad(str, len, pad, 1)
  _.st.padr = function(str, len, pad){
    return _.st.pad(str, len, pad, 1);
  }

  /* st.sort
   * ( String
   *   Function = Sorter
   * ) -> String
   */
  _.st.sort = function(str, fnc, ord){
    return _.ar.sort(str.split(''), fnc).join('');
  }

  /* st.index
   * ( String
   * ) -> Integer|Boolean
   */
  _.st.index = _.ar.index;

  /* st.is_maybe_float
   * ( String
   * ) -> Boolean
   */
  _.st.is_maybe_float = function(s){
    return s.match(/^[-+]?([0-9]*\.[0-9]+|[0-9]+)$/) ? true : false;
  }

  /* st.is_maybe_integer
   * ( String
   * ) -> Boolean
   */
  _.st.is_maybe_integer = function(s){
    return s.match(/^[-+]?([0-9]+)$/) ? true : false;
  }

  /* st.match_cnjp
   * ( String
   * ) -> Array|Null
   */
  _.st.match_cnjp = function(s){
    return s.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/g);
  }

  /* st.is_alpha
   * ( String
   * ) -> Booelan
   */
  _.st.is_alpha = function(s){
    return s.match(/^[a-zA-Z]+$/) ? true : false;
  }
  /* st.is_alpha_numeric
   * ( String
   * ) -> Boolean
   */
  _.st.is_alpha_numeric = function(s){
    return s.match(/^[a-zA-Z0-9]+$/) ? true : false;
  }

  /* st.split
   * ( String
   *   String = Separater
   * ) -> Array
   */
  _.st.split = function(s, glue){
    if(glue){
      return s.split(glue);
    }else{
      return s.split(/[\r\n|\n|\r]+/);
    }
  }


  //------------------------------------------------
  // #Function
  //------------------------------------------------

  /* fn.pack
   * ( Array[Function...]
   *   ?Object = Defaults
   * ) -> Object
   *
   * Package list of Functions to Object.
   *
   * function hello(){
   *   alert("hello");
   * }
   *
   * pack([hello]) => { hello: function hello() }
   */
  _.fn.pack = function(fns, def) {
    switch(_.vr.type(fns)){
      case 'array':
        return fns.reduce(function(m, fn){
          (function(n){
            (n && (m[n] = fn));
          })(_.fn.nameof(fn))
          return m;
        }, def || {});
      case 'object':
        return _.ob.merge(def || {}, fns);
      default:
        return def || {};
    }
  }

  /* fn.instance
   * ( Function = Constructor
   * ) -> Object
   *
   * Create new instance with arguments
   * (For who hates 'new' word.)
   *
   */
  _.fn.construct = function(constructor){
    return new (constructor.bind.apply(constructor, [constructor].concat(_.ar.clone(arguments).slice(1))));
  }

  /* func.nameof
   * ( Function
   * ) -> String
   *
   * Returns the function name.
   */
  _.fn.nameof = function(fn) {
    return (_.ob.has(fn, 'name'))
      ? fn.name
      : (function(s){
          return s.substr(0, _.st.index(s,'(')).replace(/ /g, '');
        })(fn.toString().substr('function '.length));
  }

  /* func.argsof
   * ( Function
   * ) -> Array
   *
   * !! DONT trust this.
   *
   * Returns argument names list.
   */
  _.fn.argsof = function(fn) {
    var z = fn.toString().substr('function '.length)
      , y = z.substr(_.st.index(z,'(') + 1, _.st.index(z,')') - _.st.index(z,'(') - 1).split(',')
      , x = function(mm, v){ var r = v.replace(/ /g, ''); r.length && mm.push(r); return mm;} ;
    return y.reduce(x, []);
  }

  /* fn.proxy
   * ( Function
   *   Object
   * ) -> Function
   *
   * Bind some callable to specific context.
   * Almost same as jQuery.proxy() method. Maybe.
   */
  _.fn.proxy = function(c, cn) {
    return (function(args){
      return function(){ return c.apply(cn, args.concat(_.ar.clone(arguments))); };
    })(_.ar.clone(arguments).slice(2));
  }
  _.fn.bind = _.fn.proxy

  /* func.partial
   * ( Function
   *   Array = List for vr.valid
   * ) -> Function
   *
   * Make a Function to (pseudo) partial.
   *
   * partial(fn, 2)
   *   means: 'fn' takes 2 parameters. (NON type specified)
   *   Parameter will NOT be validated.
   *
   * partial(fn, 'number', 'object')
   *   means: almost same as above. 'fn' will be treated as
   *   `Function(Number var1, Object var2)`.
   *
   *   All parameters will be validated by `variable.type()` function.
   *   (If validation failed, last calculated value always return `undefined`.)
   *
   *-- example --*
   * var fn = function(a,b){ return a + b; };
   * var a = partial(fn, ['number', 'number']);
   * var b = a(4);     // Make ( 4 + n ) function.
   * var c = b(10);    // 14
   * var d = b('Foo'); // undefined <- because 2nd argument type is defined as 'number'.
   * var e = a(5, 20)  // Yes, 25. As you know.
   *
   * # If you want to skip arguments validation,
   * # use like below.
   *
   * var partialized = _.partial(function(a, b){
   *   return a * b;
   * });
   *
   */
  _.fn.partial = function(f, v) {
    function _m(a){
      return function(){
        return (function(s){
          return v && !_.ar.valid(s, v)
            ? (function(){raise("Invalid arguments passed. The arguments should be (" + (v.toString()) + ")");})()
            : ((s.length >= (v||f).length) ? f.apply(f, s) : _m(s));
        })(a.concat(_.ar.clone(arguments)));
      }
    }
    return function(){
      return _m(_.ar.clone(arguments))();
    };
  }

  /* func.bind_partial
   * ( Object = Binding context
   *   Function
   * ) -> Function
   *
   * return Context bound partial.
   */
  _.fn.bind_partial = function(context, fn){
    return _.fn.partial.apply(
      context, [_.fn.proxy(fn, context)].concat(_.ar.clone(arguments).slice(2))
    );
  }

  /* fn.info
   * ( Function
   * ) -> Object
   *
   * !! DONT trust this
   *
   * return function information.
   */
  _.fn.info = function(fn){
    return (_.vr.is_f(fn))
      ? undefined
      : { name: _.fn.nameof(fn) || '(anonymous)',
          args: _.fn.argsof(fn),
          body: fn };
  }
  
  
  /* async.promise
   * ( Function(
   *     Function = resolver
   *     Function = rejecter
   *   )
   * ) -> FM_Promise
   *
   * Really simple version of $.Deferred.
   *
   * FM_Promise contains below methods.
   *   state   # String
   *   expired # Boolean
   *   then()
   *   catch()
   *   resolve()
   *   reject()
   * }
   *
   * var p = FM.promise();
   *
   * p.then(function(previous, first){
   *   return previous_result + 1;
   * });
   *
   * p.always(function(previous_result, first){
   *   return previous_result + 1;
   * });
   *
   * p.resolve(2);
   *
   */
  _.async.promise = function(process){
    return new (_.config.promise)(
      _.vr.is_f(process)
        ? process
        : function(rs){ return rs(process) }
    );
  }

  _.async.homonogenize = function(ar){
    return _.ar.map(ar, function(p, i){
      if(!(p instanceof (_.config.promise))){
        p = _.promise(function(res, rej){
          (p) ? res(p) : rej(p);
        });
      }
    });
  }

  /* fn.swear
   * ( Array = Promises
   * ) -> FM_Promise
   */
  _.async.swear = function(arg){
    var promise  = _.promise();
    var resolved = 0;
    var results  = [];

    var available
      = (_.vr.is_a(arg) && arguments.length == 1)
        ? arg
        : _.ar.clone(arguments);

    (available.length === 0) && _.config.promise.resolve([]);

    _.ar.each(_.async.homonogenize(available), function(p, i){
      p.always(function(s){
        results[i] = (arguments.length == 2) ? s : _.ar.clone(arguments).slice(0, -1);
        return arguments[arguments.length - 1];
      })
      .then(function(s){
        resolved++;
        (resolved === available.length)
          && promise.resolve.apply(promise, results);
        return arguments[arguments.length - 1];
      }, function(){
        promise.reject.apply(promise, results);
        return arguments[arguments.length - 1];
      });
    });

    return promise;
  }

  _.async.smashbros = function(qs, opt){
    var handler = [];
    var settled = {resolved: [], rejected:[]};
    var resolved = [];
    var rejected = [];
    var opt = FM.ob.define({
      validate: function(rsd, rjd){
        return rsd.length === 1;
      },
      handle: function(hdls, stld, rsd, rjd, opt){
        if(!opt.ignore){
          FM.ar.each(hdls, function(h){
            if(stld.resolved.indexOf(h[0]) < 0
            && stld.rejected.indexOf(h[0]) < 0) h[2]();
          });
        }
        return true;
      },
      ignore: true,
      count: undefined,
      interval: undefined
    })(opt);

    return _.async.promise(function(rs, rj){
      var is_done = false;
      var watch = function(result, index){
        if(opt.validate(resolved, rejected)){
          if(opt.handle(handler, settled, resolved, rejected, opt)){
            !is_done && rs(resolved);
            is_done = true;
          }else{
            !is_done && rj(rejected);
            is_done = true;
          }
        }
      }
      var r = qs.map(function(q, i){
        var poll =
          (_.vr.is_pr(q))
          ? _.async.promise(function(c_rs, c_rj){
              if(!handler[i]) handler[i] = [q, c_rs, c_rj];
              q.then(c_rs);
              q.catch(c_rj);
            })
          : ((_.vr.is_f(q))
              ? (_.vr.is_af(q)
                ? (function(){
                    if(!handler[i]) handler[i] = [q, poll_rs, poll_rj];
                    return _.async.poll(q);
                  })()
                : _.async.poll(function(poll_rs, poll_rj){
                    if(!handler[i]) handler[i] = [q, poll_rs, poll_rj];
                    q(poll_rs, poll_rj);
                  }, opt.count, opt.interval)
              )
              : _.async.promise(q)
            )
          ;

        poll.then(function(r){
          settled.resolved.push(q);
          resolved.push(r);
          watch(r, i);
        });

        poll.catch(function(r){
          settled.rejected.push(q);
          rejected.push(r);
          watch(r, i);
        });

        return poll;
      });
    });
  }

  _.async.queue = function(qs, max, seq){
    var qs = Array.prototype.slice.call(qs);
    var rs = [];
    var mx = max || 4;
    var sq = seq || false;
    var cw = ti = 0;
    var stl = false;

    return new (_.config.promise)((fin,fail) => {
      var handle = function(i){
        return function(r){
          rs[i] = r;
          cw--;
          nxt();
        }
      };
      var error = function(i){
        return function(r){
          fail(r, rs);
        }
      };
      const nxt = function(){
        if(cw < mx && ti < qs.length){
          let q = qs[ti];
          ((q instanceof Array) ? _.async.queue(q, mx, sq) : q()
          ).then(handle(ti)).catch((sq) ? handle(ti) : error(ti))
          ti++; cw++;
          nxt();
        }else if(cw === 0 && ti === qs.length){
          fin(rs);
        }
      };

      nxt();
    });
  }

  _.async.import = async function(path, param){
    var r;
    if(require && module){
      r = require(path);
    }else{
      r = await import(path);
      /* CJS redirects only for default exports */
      r = (r.default) ? r.default : r;
    }

    if(_.vr.is_af(r)){
      return await r(param);
    }else if(r instanceof Promise){
      return await r;
    }else if(_.vr.is_f(r)){
      return r(param);
    }else{
      return r;
    }
  }

  /* async.poll
   * ( Function : callback
   *   ?Integer : timeout as millisec
   *   ?Integer : interval as millisec
   * ) => FM_Promise || Promise
   */
  _.async.poll = function(clb, count, interval){
    var settled = false, serial, i = 0, c = (count || 10000);

    var stop = function(r){
      settled = true;
      (serial) && clearTimeout(serial);
      return r;
    }

    var p = _.async.promise(function(rs, rj){
      var main = function(){
        if(settled) return stop();
        i++;
        if(i > c){
          return rj(new Error("FM.async.poll Timed out"));
        }else{
          try{
            var stat = clb(rs, rj);
            (_.vr.is_pr(stat))
              ? stat.catch(function(e){
                  rj("FM.async.poll: Callback rejected. => " + FM.vr.stringify(e));
                }).then(watch)
              : watch();
          }catch(e){
            stop(); rj(e);
            return;
          }
        }
      }
      var watch = function(r){
        try{
          serial = setTimeout(function(){
            !settled && main();
          }, interval || 600);
        }catch(e){
          if(settled){
            stop();
          }else{
            stop();
            return rj(e.message);
          }
        }
      }
      main();
    });

    p.then(stop); p.catch(stop);
    return p;
  }
  _.async.loop = _.async.poll;

  _.async.sleep = function(delay){
    return new Promise((rs) => setTimeout(rs, delay));
  }


  //------------------------------------------------
  // File
  //------------------------------------------------

  /* file.open
   * ( FileList
   *   Object
   * ) -> FileList
   *
   * Read all FileList's elements.
   *
   * == Image preview sample.
   *
   * <img type="file" id="f">
   *
   * $('#f').on('change', function(e){
   *   _.file.open(e.target.files, {
   *     onloadend: function(e){
   *       $(window).append('<img src="'+ e.target.result +'" alt="'+ e.target.file.name +'">');
   *     }
   *   });
   * });
   *
   */
  _.file.open = function(files, c){
    var fs = _.vr.valid(files, FileList) ? files : [files];
    for(var i = 0, f; f = fs[i]; i++){
      _.file.read(f, c);
    }
    return fs;
  }

  /* file.read
   * ( File
   *   Object
   * ) -> FileReader
   *
   * Simple wrapper for FileReader
   *
   * read(f, { method: 'dataURL', oncomplete: function(e){} });
   * > read as dataURL.
   */
  _.file.read = function(file, conf){
    var c = _.vr.is_o(conf)
          ? _.ob.merge({type: 'dataURL'}, conf)
          : {type: 'dataURL'};
    var r = _.ob.merge(new FileReader, c);
    // Make accessable as e.target.file from callbacks.
    r.file = file;
    switch(c.method){
      case 'binary':
        r.readAsBinaryString(file); break;
      case 'dataURL':
        r.readAsDataURL(file); break;
      case 'text':
        r.readAsText(file); break;
      case 'array':
        r.readAsArrayBuffer(file); break;
      default:
        r.readAsDataURL(file); break;
    }
    return r;
  }


  //------------------------------------------------
  // Event
  //------------------------------------------------

  /* event.create
   * ( String = Event name. ex:"click.sample"
   *   Function = Callback
   *   Array = Default arguments
   * ) -> FM_Event
   */
  _.event.create = function(ev, c, p){
    return new FM_Event(ev, c, p);
  }

  /* event.bind
   * ( String | FM_Event, = Event target. (Any type of referencable objects.)
   *   String,            = Event type: 'click.something'
   *   Function,          = Callback
   *   [Array],           = Default parameters for triggering.
   *   [Boolean]          = Bubbling flag.
   * ) -> FM_Event
   */
  _.event.bind = function(t, ev, c, p, cpt){

    var i, evo, m;
    var evo;
    var h = false;

    if(ev instanceof FM_Event){
      evo = ev;
      if(!evo.handler && _.vr.is_f(c)){
        evo.handler = c;
      }
    }else{
      evo = _.event.create(ev, c, p);
    }
    evo.target = t;
    
    var pos = Cache.event_target.indexOf(t);
    if(pos >= 0){
      h = Cache.event_holder[pos];
    }else{
      Cache.event_target.push(t);
      pos = Cache.event_target.indexOf(t);
      h = Cache.event_holder[pos] = {
        target: t,
        events: []
      }
    }

    // Supports only addEventListener
    if(t.addEventListener){
      evo.capture = cpt || false;
      t.addEventListener(
        evo.type,
        evo.handler,
        evo.capture
      );
    }

    h.events.push(evo);
    return evo;
  }

  /* event.unbind
   * ( DOMElement
   *   String = Event name
   * ) -> DOMElement
   *
   */
  _.event.unbind = function(t, ev){
    var cs = [];
    _.event.filter(t, ev, function(e, h, i){
      // Supports only removeEventListener
      if(t.removeEventListener){
        t.removeEventListener(e.type, e.handler, e.capture);
      }
      _.ar.each(h.events, function(he, hi){
        if(he === e){
          delete h.events[hi];
          cs.push(h);
        }
      });
    });
    /* clean up affected holder */
    if(cs.length){
      cs.map(function(h){
        h.events.filter(function(v){ return v; });
        if(h.events.length === 0){
          var rpos
            = Cache.event_target.indexOf(h.target);
          if(rpos >= 0){
            Cache.event_target.splice(rpos, 1);
            Cache.event_holder.splice(rpos, 1);
          }
          h = null;
        }
      });
    }
    return t;
  }

  /* event.trigger
   * ( &reference
   *   String = Event name
   *   Array = Default arguments for triggering.
   * ) -> Nothing
   *
   */
  _.event.trigger = function(t, ev, p){
    _.event.filter(t, ev, function(e){
      e.handler.apply(t, [e, p]);
    });
  };

  /* event.filter
   * ( &reference
   *   String = Event name
   *   Function = Callback
   * ) -> Array = [FM_Event...]
   */
  _.event.filter = function(t, ev, fn){
    var d = _.event.create(ev);
    var r = [];
    var h = false;
    var pos = Cache.event_target.indexOf(t);
    d.target = t;
    
    if(pos >= 0){
      h = Cache.event_holder[pos];
      _.ar.each(h.events, function(e, i){
        if(!e) return;
        if(e.target !== t) return;
        if(e.type !== d.type) return;
        var m = _.ar.filter(d.namespace, function(n, i){
          return (e.namespace[i] && e.namespace[i] == n);
        });
        if(m.length < d.namespace.length) return;
        fn && fn.apply(t, [e, h, i]);
        r.push(e);
      });
    }

    return r;
  }


  //------------------------------------------------
  // Time
  //------------------------------------------------

  /* time.monitor
   * ( a
   *   Integer
   *   Function
   * ) -> Function
   *
   * Monitor a variable and validate after N seconds.
   * Maybe convenience to observe events fired too many times in "1" action.
   * (like GUI events: window(resize|loaded), mouse(move|drag|select)... etc.)
   *
   * @example
   * Calling monitoring callback within 1.8sec will refreshe timestamp.
   * In below example, when only window's width is changed, this will
   * output message to the console after 1.8ec
   *
   * var m = FM.time.monitor(1800);
   *
   * window.addEventListener('resize', function(){
   *   m(
   *     window.innerHeight,
   *     function(p){
   *       (p === window.innerHeight)
   *         && console.log('Resized and kept innerHeight 1.8sec');
   *     }
   *   );
   * });
   *
   *
   */
  _.time.monitor = function(tm, callback){
    var tl;
    return function(t, f){
      var fn = f || callback || function(){};
      clearTimeout(tl);
      tl = setTimeout(function(){
        fn(t);
        tl = undefined;
      }, tm);
    }
  }
  
  _.time.loop = function(len, span){
    return function(fn){
      var
        tl
      , fr = 0
      , sp = span > 0 ? span : 18
      ;

      len = (len > 0) ? len : false;
      
      clb = (len && sp)
        ? function(){
            fr += sp;
            if(fr > len){
              clearInterval(tl);
              tl = undefined;
            }else{
              fn(tl, fr);
            }
          }
        : function(){
            fn(tl);
          }
        ;
        
      tl = setInterval(clb, sp);
    }
  }


  //------------------------------------------------
  // Date
  //------------------------------------------------

  _.date.now = function(){
    return new FM_Date();
  }

  _.date.at = function(date){
    return new FM_Date(date);
  }


  //------------------------------------------------
  // URI
  //------------------------------------------------

  /* uri.serialize
   * ( Object
   *   ?Array = Default stack.
   * ) -> String
   */
  _.uri.serialize = function(o, stack){
    return _.ob.serialize(o, stack).reduce(function(m, n){
      return m + (m ? '&' : '') + encodeURIComponent(n[0]) + '=' + encodeURIComponent(n[1]);
    }, '');
  }

  /* uri.unserialize
   * ( String
   *   Object
   * ) -> Object
   */
  _.uri.unserialize = function(str, obj){
    var ret = obj || {};
    _.ob.unserialize(str.split('&'), ret, function(s){
      var c = s.split('=');
      return [decodeURIComponent(c[0]), decodeURIComponent(c[1])];
    });
    return ret;
  }


  //------------------------------------------------
  // DOM
  //-----------------------------------------------

  /* dom.query
   * ( # See below examples.
   * )
   *
   * Multiple conditions mean "AND"
   * Single condition with Array means "OR"
   *
   * Always returns FM_DOMQuery[HTMLElement, HTMLElement, ...]
   *
   * Arguments can be stacked multiple times.
   * Every argument filters previous argument's query result.
   * (This means dom.query requires 2 arguments at least.)
   *
   * dom.query('div', 'span') -> Almost same as dom.query(document, 'div span')
   * dom.query('div') -> dom.query(document, 'div')
   * dom.query(['ul', 'ol'], 'li') -> Same as dom.query('ul li') + dom.query('ol li')
   * dom.query('ul', function(){}) -> Filters matched <ul></ul>.
   * dom.query({'.some': 'span', '.thing': 'p'}) -> Same as dom.query('.some span') + dom.query('.thing p')
   * dom.query({'div': {'ul': function(){}}}) -> Same as dom.query('div', 'ul', funciton(){});
   * dom.query(FM_DOMQuery) -> Returns passed FM_DOMQuery. Edge condition.
   * dom.query(HTMLElement) -> Returns FM_DOMQuery[HTMLElement]
   * dom.query(HTMLElement, 'span') -> Same as HTMLElement.querySelectorAll('span');
   *
   */
  _.dom.query = function(/* selector ... */){
    var args = _.ar.clone(arguments);

    // Merger
    function mg(stack, result){
      stack.push.apply(stack, _.ar.filter(result, function(n){
        return !_.ar.has(stack, n);
      }));
    }

    switch(args.length){
      case 0:
        // Do nothing
        return new FM_DOMQuery;
      case 1:
        // To avoid iterating non-exists elements
        if(args[0] instanceof HTMLElement){
          return new FM_DOMQuery(args[0]);
        }else{
          if(args[0] instanceof FM_DOMQuery && args[0].FM_DOMQuery){
            return args[0];
          }else{
            return _.dom.query(document, args[0]);
          }
        }
      default:
        var target = args.shift();
        var selector = args.shift();
        var ret = new FM_DOMQuery;
        var stype = _.vr.type(selector);

        // Recursion escape condition.
        if(target.querySelectorAll){
          switch(stype){
            case 'string':
              var r = _.ar.clone(target.querySelectorAll(selector));
              mg(ret, r);
              break;
            case 'array':
              _.ar.each(selector, function(s){
                mg(ret, _.dom.query(target, s));
              });
              break;
            case 'function':
              mg(ret, _.ar.filter(_.dom.query(target), selector));
              break;
            case 'object':
              _.ob.each(selector, function(k, v){
                switch(_.vr.type(v)){
                  case 'array':
                  case 'object':
                  case 'string':
                  case 'function':
                    mg(ret, _.dom.query(target, k, v));
                    break;
                };
              });
              break;
          }
        }else{
          switch(_.vr.type(target)){
            case 'array':
              var l = target.length, tmp, el;
              while(l--){
                el = target[l];
                tmp = _.dom.query(el, selector);
                if(tmp.length > 0){
                  if(ret.length === 0){
                    ret = tmp;
                  }else{
                    mg(ret, tmp);
                  }
                }
              }
              break;
            case 'string':
              ret = _.dom.query(_.dom.query(target), selector);
              break;
            case 'object':
              ret = _.dom.query.apply(null, [document, target, selector].concat(args));
              break;
          }
        }

        // Executing dom.query with remaining arguments.
        if(args.length > 0){
          ret = _.dom.query.apply(null, [ret].concat(args));
        }

        return ret;
    }
  }

  _.dom.find = function(){
    var r = _.dom.query.apply(null, arguments);
    return r.length > 0 ? r[0] : null;
  }

  /* dom.each
   * ( n = dom.query selecter
   *   ...
   *   Function = Callback
   *   ( HTMLElement
   *     Integer = Index
   *   )
   * ) -> FM_DOMQuery
   */
  _.dom.each = function(/* selecter... , callback */){
    var ret = new FM_DOMQuery;
    var args = _.ar.clone(arguments);
    var callback = args.pop();

    if(_.vr.is_f(callback)){
      ret = _.dom.query.apply(null, args);
      return _.ar.each(ret, function(e, i){
        (e instanceof HTMLElement) && callback.apply(e, [e, i]);
      });
    }else{
      ret = _.dom.query.apply(null, args.concat(callback));
    }

    return ret;
  }

  /* dom.map
   * ( n = dom.query selecter
   *   ...
   *   Function = Callback
   *   ( HTMLElement
   *     Integer = Index
   *   )
   * ) -> Array
   *
   */
  _.dom.map = function(/* selector... , callback */){
    var r = [];
    var args = _.ar.clone(arguments);
    var callback = args.pop();
    if(_.vr.is_f(callback)){
      _.dom.each.apply(null, args.concat(function(el, i){
        r.push(callback(el, i));
      }));
    }
    return r;
  }

  _.dom.create = function(tag, attr, content){
    var el = document.createElement(tag);
    (attr) && _.dom.attr(el, attr);
    (content) && _.dom.html(el, content);
    return el;
  }

  _.dom.prop = function(q, k, v){
    var k = _.ob.has(dom_prop_trans, k) ? dom_prop_trans[k] : k;
    switch(arguments.length){
      case 3:
        var is_f = _.vr.is_f(v);
        return _.dom.each(q, function(el){
          if(_.ob.know(el, k)){
            el[k] = (is_f) ? v.call(el, el) : v;
          }
        });
      case 2:
        return _.dom.map(q, function(el){
          if(_.ob.know(el, k)){
            return el[k];
          }
        });
    }
  }
  var dom_prop_trans = {
    'tag': 'tagName',
    'class': 'classList'
  }

  _.dom.attr = function(q, attr, prefix){
    switch(_.vr.type(attr)){
      case 'string':
        return _.dom.map(q, function(el){
          return el.getAttribute(attr);
        });
      case 'object':
        return _.dom.each(q, function(el){
          for(var k in attr){
            el.setAttribute((prefix) ? prefix + k : k, attr[k]);
          }
        });
    }
  }

  _.dom.html = function(q, html){
    switch(arguments.length){
      case 2:
        return _.dom.each(q, function(el){
          _.dom.prop(el, 'innerHTML', html);
        });
      case 1:
        return _.dom.map(q, function(el){
          return el.innerHTML;
        });
    }
  }

  _.dom.text = function(q, text){
    switch(arguments.length){
      case 2:
        return _.dom.each(q, function(el){
          _.dom.prop(el, 'innerText', text);
        });
      case 1:
        return _.dom.map(q, function(el){
          return el.innerText;
        });
    }
  }

  /* dom.style
   * ( a = DOM Query
   *   Object = {'style-name': 'style-value'}
   * )
   */
  _.dom.style = function(q, styles){
    return _.dom.each(q, function(el){
      if(el.style){
        for(var k in styles){
          var cc = _.st.to_camel(k.replace(/^-/, ''));
          if(_.ob.has(el.style, cc)){
            el.style[cc] = styles[k];
          }
        }
      }
    });
  }

  /* dom.append
   * ( a = DOM Query
   *   [
   *     String = Add as text
   *     ||
   *     b = DOM Query
   *   ]
   * ) -> FM_DOMQuery
   */
  _.dom.append = function(q, s, clone){
    var a = new FM_DOMQuery;
    _.dom.each(q, function(el){
      if(_.vr.is_s(s)){
        el.innerHTML = el.innerHTML + s;
        a.push(el);
      }else{
        _.dom.each(s, function(c){
          a.push(el.appendChild(clone ? c.cloneNode(true) : c));
        });
      }
    });
    return a;
  }

  /* dom.prepend
   * ( a = DOM Query
   *   [
   *     String = Add as text.
   *     ||
   *     b = DOM Query
   *   ]
   * ) -> FM_DOMQuery
   */
  _.dom.prepend = function(q, s, clone){
    return _.dom.each(q, function(el){
      if(_.vr.is_s(s)){
        el.innerHTML = s + el.innerHTML;
      }else{
        _.dom.each(s, function(c){
          var e = (clone ? c.cloneNode(true) : c);
          el.insertBefore(e, el.firstChild);
        });
      }
    });
  }

  _.dom.remove = function(){
    return _.dom.each.apply(null, _.ar.clone(arguments).concat(function(el){
      el.parentNode.removeChild(el);
    }));
  }

  /* dom.empty
   * ( a = DOM Query
   *   ...
   * ) -> FM_DOMQuery
   */
  _.dom.empty = function(){
    return _.dom.each.apply(null, _.ar.clone(arguments).concat(function(el){
      _.dom.html(el, "");
    }));
  }

  /* dom.toggle_class
   * ( a = DOM Query
   *   String = Class name
   *   Boolean = Add or Remove
   * ) -> FM_DOMQuery
   */
  _.dom.toggle_class = function(q, c, add){
    var ndl = _.vr.is_a(c) ? c : _.ar.filter(c.split(' '));
    return _.dom.each(q, function(el){
      var cs = _.ar.filter(el.className.split(' '));
      _.ar.each(ndl, function(c){
        var a = (add === undefined) ? !_.ar.has(cs, c) : add;
        if(a){
          if(!_.ar.has(cs, c)){
            cs = cs.concat(c);
          }
        }else{
          cs = cs.filter(function(v){
            return v !== c;
          });
        }
      });
      el.className = cs.join(' ');
    });
  }

  /* dom.add_class
   * ( a = DOM Query
   *   String
   * ) -> FM_DOMQuery
   */
  _.dom.add_class = function(q, c){
    return _.dom.toggle_class(q, c, true);
  }

  /* dom.remove_class
   * ( a = DOM Query
   *   String
   * ) -> FM_DOMQuery
   */
  _.dom.remove_class = function(q, c){
    return _.dom.toggle_class(q, c, false);
  }

  /* dom.has_class
   * ( a = DOM Query
   *   String
   * ) -> Boolean
   */
  _.dom.has_class = function(q, c){
    var r = [];
    var m = _.dom.each(q, function(el){
      _.ar.has(_.dom.prop(el, 'class').shift() || [], c) && r.push(el);
    });
    return r.length == m.length;
  }


  //------------------------------------------------
  // HTML
  //------------------------------------------------

  _.html.trim = function(html, selector){
    var d = _.dom.create('div', null, html);
    _.dom.remove(d, selector);
    return _.html.unescape(d.innerHTML);
  }

  _.html.escape = function(html, pairs){
    return html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#039;');
  }

  _.html.unescape = function(html, pairs){
    var div = document.createElement("div");
    div.innerHTML = html.replace(/</g,"&lt;")
                        .replace(/>/g,"&gt;")
                        .replace(/ /g, "&nbsp;")
                        .replace(/\r/g, "&#13;")
                        .replace(/\n/g, "&#10;");
    return div.textContent || div.innerText;
  }


  //------------------------------------------------
  // RegExp
  //------------------------------------------------

  _.regexp.create = function(rg, o){
    return _.vr.is_s(rg)
         ? (new RegExp(_.regexp.escape(rg), o))
         : (rg instanceof RegExp ? rg : (new RegExp()));
  }

  _.regexp.escape = function(str){
    return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }


  // Aliases ---------------------------------------
  _.promise = _.async.promise;
  _.proxy   = _.fn.proxy;


  return _;
});
