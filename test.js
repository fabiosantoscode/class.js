(function () {
'use strict'

var cls = require('./class'),
    makeClass = cls.makeClass,
    isSubclass = cls.isSubclass,
    availableProxyApi = cls.availableProxyApi;

var ok = require('assert')

describe('class.js', function () {
    // Stuff used in the tests
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

    it('enables us to create classes looking like Javascript classes', function () {
        ok(person)
        ok.equal(person.asdragons(), 'badragons')
        ok.equal(Person.badrage().foo, 'bar')
        ok.equal(person.foo, 'bar')
        ok.equal(Person.CONSTANT, 'variable')
    })

    it('handles subclassing of static methods as well as the usual prototype inheritance', function () {
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
    })

    it('has a utility isSubclass function', function () {
        var SubPerson = makeClass(Person)
        var ThirdLevel = makeClass(SubPerson)

        ok(isSubclass(Person, Person))
        ok(isSubclass(SubPerson, Person))
        ok(isSubclass(ThirdLevel, SubPerson))
        ok(isSubclass(ThirdLevel, Person))
    })

    it('Lets us access the superclass\'s method', function () {
        var SubPerson = makeClass(Person)
        var Sub2Person = makeClass(SubPerson)

        Sub2Person.static.__create__ = function () {
            this.baz = 'baz'
            SubPerson.static.__create__.call(this)
        }

        Sub2Person.proto.asdragons = function () {
            return SubPerson.proto.asdragons.call(this) + ' fraggles!'
        }

        var sub2Person = Sub2Person.create()

        ok(sub2Person.foo)
        ok(sub2Person.baz)

        ok.equal(sub2Person.asdragons(), 'badragons fraggles!')
    })

    it('features overriding of dynamic and static properties.', function () {
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
    })

    describe('multiple inheritance', function () {
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

        it('accesses parents\' properties', function () {
            ok(C.cThing)
            ok(C.create().cThing)

            // Let's access every parents' properties. All of these were unambiguous
            ok(C.bThing)
            ok(C.create().bThing)

            ok(C.aThing)
            ok(C.create().aThing)

            ok(C.baseThing)
            ok(C.create().baseThing)
        })

        it('is a right to left thing. The declaration was makeClass(A, B) so only if a property is not in B it is looked up in A', function () {
            ok.equal(C.thing, 'static B thing')
            ok.equal(C.create().thing, 'B thing')

            var switchedBasesC = makeClass(B, A)
            ok.equal(switchedBasesC.thing, 'static A thing')
            ok.equal(switchedBasesC.create().thing, 'A thing')
        })

        it('works with isSubclass', function () {
            ok(isSubclass(A, Base))
            ok(isSubclass(B, Base))
            ok(isSubclass(C, Base))

            ok(isSubclass(C, A))
            ok(isSubclass(C, B))

            ok(isSubclass(C, A, false)) // If the third argument to this function exists and is false, the function does not take mixins into account.
            ok(!isSubclass(C, B, false)) // B is a "mixin" class because it's not the first argument to makeClass
            // That said, this is moot since in dynamic mode the "b" class is not really a mixin to C because inheritance is dynamic.

            ok(isSubclass(C, Base))
        })

        it('dynamic mode', function () {
            if (cls.availableProxyApi) {
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
            } else {
                console.log('Warning. Running tests in static mode')
            }
        })
    })

// future test

// new C()

// ok.equal(new C().baseThing, 'base thing')
// ok.equal(new C().thing, 'B thing')
// ok.equal(new C().aThing, 'A thing')
// ok.equal(new C().bThing, 'B thing')
})

}())
