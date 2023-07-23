/**
* Use this file to define custom functions and blocks.
* Read more at https://makecode.microbit.org/blocks/custom
*/

/**
 * sstate blocks
 * icon: a Unicode identifier for an icon from the Font Awesome icon set.
 *       http://fontawesome.io/icons
 */
//% weight=100 color="#4C97FF" icon="\uf362"
//% groups="['Command', 'Define']"
namespace sstate {

    /**
     * EntryProc
     */
    class EntryProc {
        _name: string
        _body: (prevName: string) => void

        /**
         * constructor
         * @param name state name 
         * @param body ENTRY
         */
        constructor(name: string, body: (prevName: string) => void) {
            this._name = name
            this._body = body
        }

        /**
         * state name
         */
        get name() { return this._name }
        /**
         * execute ENTRY
         * @param prevName previous state name
         */
        execute(prevName: string) { this._body(prevName) }
    }

    /**
     * DoProc
     */
    class DoProc {
        _name: string
        _interval: number
        _body: () => void
        _lastTick: number
        _nextTick: number
        _must: boolean

        /**
         * constructor
         * @param name state name
         * @param interval ms
         * @param body DO
         */
        constructor(name: string, interval: number, body: () => void) {
            this._name = name
            this._interval = interval
            this._body = body
            this._lastTick = control.millis()
            this._nextTick = this._lastTick
            this._must = true
        }

        /**
         * state name
         */
        get name() { return this._name }

        /**
         * execute DO, every (interval) ms
         */
        execute() {
            const tick = control.millis()
            if (this._must || (this._nextTick < tick)) {
                this._body()
                this._must = false
                this._lastTick = tick
                this._nextTick = tick + this._interval
            }
        }
        /**
         * must execute DO.
         */
        mustDo() {
            this._must = true
        }
    }

    /**
     * ExitProc
     */
    class ExitProc {
        _name: string
        _body: (nextName: string) => void

        /**
         * constructor
         * @param name state name 
         * @param body EXIT
         */
        constructor(name: string, body: (nextName: string) => void) {
            this._name = name
            this._body = body
        }

        /**
         * state name
         */
        get name() { return this._name }

        /**
         * execute EXIT
         * @param nextName next state name
         */
        execute(nextName: string) { this._body(nextName) }
    }

    /**
     * Transition
     */
    class Transition {
        _name: string
        _trigger: string
        _to: string

        /**
         * constructor
         * @param name state name from
         * @param trigger trigger
         * @param to state name to
         */
        constructor(name: string, trigger: string, to: string) {
            this._name = name
            this._trigger = trigger
            this._to = to
        }

        get name() { return this._name }
        get trigger() { return this._trigger }
        get to() { return this._to }
    }

    let entryProcList: EntryProc[] = []
    let doProcList: DoProc[] = []
    let exitProcList: ExitProc[] = []

    let transitionList: Transition[] = []

    let triggerQueue: string[] = []

    let state = ""
    let activeDoProcList: DoProc[] = []
    let autoTrantision: Transition = undefined
    let activeTransitionList: Transition[] = []

    /**
     * transit
     * @param transition instance or undefined 
     * @returns true: transit, false: (nop)
     */
    function transit(transition: Transition) {
        if (!transition) {
            return false
        }
        const prev = state
        const next = transition.to
        // EXIT
        for (const obj of exitProcList) {
            if (obj.name == prev) {
                obj.execute(transition.to)
            }
        }

        state = next // change state

        activeDoProcList = doProcList.filter((item) => {
            if (item.name == next) {
                item.mustDo()
                return true
            } else {
                return false
            }
        })
        activeTransitionList = transitionList.filter((item) => item.name == next)
        autoTrantision = activeTransitionList.find((item) => item.trigger == "")

        // ENTRY
        for (const obj of entryProcList) {
            if (obj.name == state) {
                obj.execute(prev)
            }
        }

        return true
    }

    /**
     * start state machine
     * @param initial initial state name
     */
    //% block="start $initial"
    //% backgroudLoop.shadow="timePicker"
    //% weight=80
    //% group="Command"
    export function start(initial: string) {
        if ("" != state) {
            return
        }
        control.inBackground(function () {
            const initialTransition = new Transition("", "", initial)
            transit(initialTransition)
            while ("" != state) {
                // DO
                for (const doProc of activeDoProcList) {
                    doProc.execute()
                }

                // auto trantision
                if (transit(autoTrantision)) {
                    continue;   // while ("" != state)
                }

                basic.pause(100)    // wait for idle

                // trigger?
                while (triggerQueue.length > 0) {
                    // transit
                    const trigger = triggerQueue.shift()
                    const transition = activeTransitionList.find((item) => item.trigger == trigger)
                    if (transit(transition)) {
                        break // while (triggerQueue.length > 0)
                    }
                }
            }
        })
    }

    /**
     * fire trigger
     * @param trigger trigger name
     */
    //% block="fire trigger $trigger"
    //% weight=90
    //% group="Command"
    export function fire(trigger: string) {
        if (trigger.length > 0) {
            // queuing
            triggerQueue.push(trigger)
        }
    }

    /**
     * define state
     * @param name state name, is assigned to the stateName variable
     * @param body code to run
     */
    //% block="define state: $name, $stateName"
    //% draggableParameters
    //% weight=140
    //% group="Define"
    export function defineState(name: string, body: (stateName: string) => void) {
        if (name.length > 0) {
            body(name)
        }
    }

    /**
     * define ENTRY
     * @param name state name
     * @param body code to run on ENTRY. prevName is a previous state name.
     */
    //% block="state: $name ENTRY/, $prevName"
    //% draggableParameters
    //% handlerStatement
    //% weight=130
    //% group="Define"
    export function defineEntry(name: string, body: (prevName: string) => void) {
        if (name.length > 0) {
            const item = new EntryProc(name, body)
            entryProcList.push(item)
        }
    }

    /**
     * define DO
     * @param name state name
     * @param interval interval time
     * @param body code to run on DO every interval time.
     */
    //% block="state: $name DO/, every $interval ms"
    //% handlerStatement
    //% ms.shadow="timePicker"
    //% weight=120
    //% group="Define"
    export function defineDo(name: string, interval: number, body: () => void) {
        if (name.length > 0) {
            const item = new DoProc(name, interval, body)
            doProcList.push(item)
        }
    }

    /**
     * define EXIT
     * @param name state name
     * @param body code to run on EXIT. nextName is a next state name.
     */
    //% block="state: $name EXIT/, $nextName"
    //% draggableParameters
    //% handlerStatement
    //% weight=110
    //% group="Define"
    export function defineExit(name: string, body: (nextName: string) => void) {
        if (name.length > 0) {
            const item = new ExitProc(name, body)
            exitProcList.push(item)
        }
    }

    /**
     * define transition
     * @param name 
     * @param trigger 
     * @param to 
     */
    //% block="state: $name TRIGGER: $trigger TO: $to"
    //% weight=100
    //% group="Define"
    export function defineTransition(name: string, trigger: string, to: string) {
        if (name.length > 0) {
            const item = new Transition(name, trigger, to)
            transitionList.push(item)
        }
    }

}
