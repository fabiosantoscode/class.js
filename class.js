(function () {
'use strict'

module.exports = {
    Type: Type,
    isSubclass: isSubclass,
    makeClass: makeClass,
    dynamic: requireDynamicInheritance,
    requireDynamicInheritance: requireDynamicInheritance
}

var availableProxyApi

if (typeof Proxy !== "undefined") {
    if (Proxy.create) {  // Prioritize this one for now
        availableProxyApi = 'old API'
    } else {
        availableProxyApi = 'new API'
    }
} else {
    availableProxyApi = null
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
    
    if (availableProxyApi == 'old API') {
        var bProxy = makeClass(b)
        aProxy.__class__.prototype = makeOldApiProxy(bProxy.__class__.prototype, aProxy.__class__.prototype)
        aProxy.__type__.prototype = makeOldApiProxy(bProxy.__type__.prototype, aProxy.__type__.prototype)
    } else {
        // Make a subclass of A, shove all keys from B
        
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

Person.static.CONSTANT = 'variable'
Person.proto.asdragons = function () {return 'badragons'}

var person = Person.create()


var ok = require('assert')
ok(person)
ok.equal(person.asdragons(), 'badragons')
ok.equal(Person.badrage().foo, 'bar')
ok.equal(person.foo, 'bar')
ok.equal(Person.CONSTANT, 'variable')


// now for subclassing!
var SubPerson = makeClass(Person)
var subPerson = SubPerson.create()

ok.equal(subPerson.foo, 'bar') // (parent __create__)

SubPerson.static.__create__ = function () {this.foo = 'baz'}
ok.equal(SubPerson.create().foo, 'baz')

delete SubPerson.static.__create__
ok.equal(subPerson.foo, 'bar') // parent __create__ again

ok.equal(subPerson.asdragons(), 'badragons')
ok.equal(subPerson.foo, 'bar')

ok.equal(SubPerson.badrage().foo, 'bar')
ok.equal(SubPerson.CONSTANT, 'variable')

// Subclass tests
var ThirdLevel = makeClass(SubPerson)

ok(isSubclass(Person, Person))
ok(isSubclass(SubPerson, Person))
ok(isSubclass(ThirdLevel, SubPerson))
ok(isSubclass(ThirdLevel, Person))


// Using super
var Sub2Person = makeClass(SubPerson)

Sub2Person.static.__create__ = function () {
    this.baz = 'baz'
    SubPerson.static.__create__.call(this)
}

var sub2Person = Sub2Person.create()

ok(sub2Person.foo)
ok(sub2Person.baz)


// Overriding things
var Base = makeClass()
Base.proto.thing = 'base thing'
Base.static.thing = 'static base thing'
Base.proto.baseThing = 'base thing'
Base.static.baseThing = 'static base thing'

var A = makeClass(Base)
A.proto.thing = 'A thing'
A.static.thing = 'static A thing'
A.proto.aThing = 'A thing'
A.static.aThing = 'static A thing'

ok.equal(Base.thing, 'static base thing')
ok.equal(Base.baseThing, 'static base thing')
ok.equal(Base.create().thing, 'base thing')
ok.equal(Base.create().baseThing, 'base thing')

ok.equal(A.thing, 'static A thing')
ok.equal(A.baseThing, 'static base thing')
ok.equal(A.create().thing, 'A thing')
ok.equal(A.create().baseThing, 'base thing')

// Multiple inheritance.
var Base = makeClass()
Base.proto.thing = 'base thing'
Base.static.thing = 'static base thing'
Base.proto.baseThing = 'base thing'
Base.static.baseThing = 'static base thing'

var A = makeClass(Base)
A.proto.thing = 'A thing'
A.static.thing = 'static A thing'
A.proto.aThing = 'A thing'
A.static.aThing = 'static A thing'

var B = makeClass(Base)
B.proto.thing = 'B thing'
B.static.thing = 'static B thing'
B.proto.bThing = 'B thing'
B.static.bThing = 'static B thing'


var C = makeClass(A, B)// Let's cause a diamond problem!

C.proto.cThing = 'C thing'
C.static.cThing = 'static C thing'

ok(C.cThing)
ok(C.create().cThing)

// Let's access every parents' properties
ok(C.bThing)
ok(C.create().bThing)

ok(C.aThing)
ok(C.create().aThing)

ok(C.baseThing)
ok(C.create().baseThing)


// And now let's check subclassing
ok(isSubclass(A, Base))
ok(isSubclass(B, Base))
ok(isSubclass(C, Base))

ok(isSubclass(C, A))
ok(isSubclass(C, B))

ok(isSubclass(C, A, false)) // If the third argument to this function exists and is false, the function does not take mixins into account
ok(!isSubclass(C, B, false)) // B is a "mixin" class because it's not the first argument to makeClass

ok(isSubclass(C, Base))

// Inheritance is a right to left thing. The declaration was makeClass(A, B) so if the property is not in A it is in B
ok.equal(C.thing, 'static B thing')
ok.equal(C.create().thing, 'B thing')

var switchedBasesC = makeClass(B, A)
ok.equal(switchedBasesC.thing, 'static A thing')
ok.equal(switchedBasesC.create().thing, 'A thing')


if (availableProxyApi) {
    // Inheritance is dynamic. Adding stuff to the base class's proto and base makes it available to all the children.
    Base.static.newBaseThing = Base.static.newThing = 'new base thing'
    Base.static.baseThing = Base.static.thing = 'changed base thing'

    ok.equal(Base.newBaseThing, 'new base thing')
    ok.equal(Base.newThing, 'new base thing')
    ok.equal(C.newBaseThing, 'new base thing')
    ok.equal(C.newThing, 'new base thing')

    ok.equal(Base.baseThing, 'changed base thing')
    ok.equal(Base.thing, 'changed base thing')
    ok.equal(C.baseThing, 'changed base thing')
    ok.equal(C.thing, 'static B thing')  // C has this one inherited from B


    B.static.newBThing = B.static.newThing = 'new B thing'
    B.static.bThing = B.static.thing = 'changed B thing'

    ok.equal(B.newBThing, 'new B thing')
    ok.equal(B.newThing, 'new B thing')
    ok.equal(C.newBThing, 'new B thing')
    ok.equal(C.newThing, 'new B thing')

    ok.equal(B.bThing, 'changed B thing')
    ok.equal(B.thing, 'changed B thing')
    ok.equal(C.bThing, 'changed B thing')
    ok.equal(C.thing, 'changed B thing')


    A.static.newAThing = A.static.newThing = 'new A thing'
    A.static.aThing = A.static.thing = 'changed A thing'

    ok.equal(A.newAThing, 'new A thing')
    ok.equal(A.newThing, 'new A thing')
    ok.equal(C.newAThing, 'new A thing')
    ok.equal(C.newThing, 'new B thing')  // Inherited from B

    ok.equal(A.aThing, 'changed A thing')
    ok.equal(A.thing, 'changed A thing')
    ok.equal(C.aThing, 'changed A thing')
    ok.equal(C.thing, 'changed B thing')  // Inherited from B
}


// the final test

// new C()

// ok.equal(new C().baseThing, 'base thing')
// ok.equal(new C().thing, 'B thing')
// ok.equal(new C().aThing, 'A thing')
// ok.equal(new C().bThing, 'B thing')


}())
