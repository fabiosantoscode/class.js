class.js
========

A technique to create classes in Javascript featuring multiple inheritance and inheritance of static properties and methods.

This code is pretty beta, so don't use in production. Although it is tested, it's not _battle_ tested yet.

Compatibility
=============

For now, this only works on node.js. The idea is to support more environments including oldIE, except for dynamic multiple inheritance, because it requires Proxy objects, which are quite new.

To be able to use dynamic multiple inheritance, your javascript environment must provide experimental support for Proxy objects through Proxy.create. In node you enable this through `node --harmony <your script>`. To make sure this support is present, call the `dynamic` function. Even if your platform doesn't support Proxy objects, this library will implement multiple inheritance by way of copying over the second base's prototype's keys.

Example
=======

        var Person = makeClass()
        var fred = Person.create()  // coming soon: "new Person()"

        Person.static.__create__ = function () {
            this.name = ''
        }

        Person.static.GREETING = 'Hello. My name is '

        Person.proto.sayName = function () {
            console.log(Person.GREETING + this.name + '.')
        }

        fred.name = 'Fred'
        fred.sayName()  // Hello. My name is Fred.


        var Employee = makeClass(Person)
        var workerFred = Employee.create()
        workerFred.name = 'Fred'

        Employee.static.POST_GREETING = 'How can I help you?'

        Employee.proto.sayName = function () {
            console.log(Employee.GREETING + this.name + '. ' + Employee.POST_GREETING)
        }

        workerFred.sayName()  // Hello. My name is Fred. How can I help you?

Documentation
=============

For now, it's just this readme. However, the source code is rather easy to understand.

