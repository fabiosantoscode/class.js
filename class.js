(function () {
'use strict'

module.exports = {
    Type: Type,
    isSubclass: isSubclass,
    makeClass: makeClass,
    dynamic: requireDynamicInheritance,
    requireDynamicInheritance: requireDynamicInheritance,
    availableProxyApi: undefined
}

if (typeof Proxy !== "undefined") {
    if (typeof Proxy === 'function') {
        exports.availableProxyApi = 'new API'  // still unsupported
    } else if (typeof Proxy.create === 'function') {
        exports.availableProxyApi = 'old API'
    } else {
        exports.availableProxyApi = null
    }
} else {
    exports.availableProxyApi = null
}

function requireDynamicInheritance() {
    if (!availableProxyApi) {
        throw new Error('No Proxy API available. To use Proxies, use ECMAScript Harmony')
    }
    return module.exports
}

function Type() {
    if (this.__class__ && this.__type__) {
        return this.create.apply(this, arguments)
    }
}

Type.prototype.create = function () {
    var instance = new this.__class__()
    if (this.__create__) {
        this.__create__.apply(instance)
    }
    return instance
}

function makeOldApiProxy(obj, fallback) {
    return Proxy.create({
        // Fundamental traps
        getPropertyDescriptor: function (name) {
            return {
                configurable: true,
                enumerable: true,
                get: function () {
                    return obj[name] || fallback[name]
                },
                set: function (value) {
                    obj[name] = value
                }
            }
        }
        /* maybe later */
        // getOwnPropertyDescriptor:
        // getOwnPropertyNames:
        // getPropertyNames:
        // defineProperty:
        // delete:
        // fix:
        /* derived traps */
        // has:
        // hasOwn:
        // get:
        // set:
        // enumerate:
        // keys:
    })
}

function resolve2Bases(a, b) {
    var aProxy = makeClass(a)
    
    aProxy.__parent__ = a
    aProxy.__mixin__ = b
    
    // 2 base classes are resolved by subclassing the "main" base class,
    // and then make that subclass have the same properties as the second base
    // class. This is accomplished in static mode by copying every property,
    // but in dynamic mode a fancy Proxy object is created.

    if (exports.availableProxyApi == 'old API') {
        var bProxy = makeClass(b)
        aProxy.__class__.prototype = makeOldApiProxy(bProxy.__class__.prototype, aProxy.__class__.prototype)
        aProxy.__type__.prototype = makeOldApiProxy(bProxy.__type__.prototype, aProxy.__type__.prototype)
    } else {
        // Statically copy all keys from B
        Object.keys(b.__type__.prototype)
            .forEach(function (key) {
                aProxy.__type__.prototype[key] = b.__type__.prototype[key]
            })
        
        Object.keys(b.__class__.prototype)
            .forEach(function (key) {
                aProxy.__class__.prototype[key] = b.__class__.prototype[key]
            })
    }
    
    return aProxy
}

function isSubclass(cls, parent, walkMixins /*default: true*/) {
    walkMixins = walkMixins === undefined ? true : walkMixins
    if (cls.__parent__) {
        if (isSubclass(cls.__parent__, parent, walkMixins)) {
            return true
        }
    }
    if (walkMixins && cls.__mixin__) {
        if (isSubclass(cls.__mixin__, parent, walkMixins)) {
            return true
        }
    }
    return cls === parent
}

function makeClass(parentType) {
    var __type__ = new Function(),  // Its prototype holds static data.
        __class__ = new Function(),  // Its prototype holds instance data.
        theClass
    
    if (arguments.length > 1) {
        parentType = Array.prototype.reduce.call(arguments, resolve2Bases)
    }
    
    if (parentType) {
        // Extend the parent's static and non-static
        __type__.prototype = new parentType.__type__()
        __class__.prototype = new parentType.__class__()
    } else {
        // Extend the base type
        __type__.prototype = new Type
        __class__.prototype = {}
    }
    
    // Assemble the class
    theClass = new __type__()  // From now on its static stuff comes from __type__.prototype
    
    // Remember parent
    theClass.__parent__ = parentType
    
    // Assign __type__ and __class__
    theClass.__type__ = __type__
    theClass.__class__ = __class__
    
    // Shortcuts for declarations
    theClass.static = __type__.prototype  // Static properties are inherited above
    theClass.proto = __class__.prototype  // Outside we add stuff to "proto"
    
    return theClass
}

var Person = makeClass()

Person.static.__create__ = function () {
    this.foo = 'bar'
}

Person.static.badrage = function () {
    return {foo: 'bar'}
}

}())
