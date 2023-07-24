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

    enum ProcId {
        None,
        Start,
        Into,
        Enter,
        Do,
        Exit,
        Transit
    }

    class StateMachine {

        // ID
        _id: string

        // define
        _defineEntryProcList: EntryProc[]
        _defineDoProcList: DoProc[]
        _defineExitProcList: ExitProc[]
        _defineTransitionList: Transition[]

        // current state
        _state: string
        _activeEntryProcList: EntryProc[]
        _activeDoProcList: DoProc[]
        _activeExitProcList: ExitProc[]
        _activeTrantisionAuto: Transition
        _activeTransitionList: Transition[]

        // current transition
        _lastTransition: Transition

        // trigger(queue)
        _triggerQueue: string[]

        // proc
        _initialState: string
        _proc: ProcId

        /**
         * constructor
         * @param id state machine ID
         */
        constructor(id: string) {
            this._id = id
            this._defineEntryProcList = []
            this._defineDoProcList = []
            this._defineExitProcList = []
            this._defineTransitionList = []
            this._state = "" // 開始・終了状態
            this._activeEntryProcList = []
            this._activeDoProcList = []
            this._activeExitProcList = []
            this._activeTrantisionAuto = undefined
            this._activeTransitionList = []
            this._triggerQueue = []
            this._lastTransition = undefined
            this._proc = ProcId.None
        }

        defineEntry(name: string, body: (prevName: string) => void) {
            if (name.length > 0) {
                const item = new EntryProc(name, body)
                this._defineEntryProcList.push(item)
            }
        }

        defineDo(name: string, interval: number, body: () => void) {
            if (name.length > 0) {
                const item = new DoProc(name, interval, body)
                this._defineDoProcList.push(item)
            }
        }

        defineExit(name: string, body: (nextName: string) => void) {
            if (name.length > 0) {
                const item = new ExitProc(name, body)
                this._defineExitProcList.push(item)
            }
        }

        defineTransition(name: string, trigger: string, to: string) {
            if (name.length > 0) {
                const item = new Transition(name, trigger, to)
                this._defineTransitionList.push(item)
            }
        }

        _procNone() {
            // nop
        }

        _procStartToInto(): boolean {
            this._lastTransition = new Transition("", "", this._initialState)
            return this._procInto()
        }

        _procInto(): boolean {
            const next = this._lastTransition.to
            // current state
            this._state = next
            this._activeEntryProcList = this._defineEntryProcList.filter((item) => item.name == next)
            this._activeDoProcList = this._defineDoProcList.filter((item) => {
                if (item.name == next) {
                    item.mustDo()
                    return true
                } else {
                    return false
                }
            })
            this._activeExitProcList = this._defineExitProcList.filter((item) => item.name == next)
            this._activeTransitionList = this._defineTransitionList.filter((item) => item.name == next)
            this._activeTrantisionAuto = this._activeTransitionList.find((item) => item.trigger == "")
            return (this._state.length > 0)
        }

        _procEnter() {
            const prev = this._lastTransition.name
            for (const entryProc of this._activeEntryProcList) {
                entryProc.execute(prev)
            }
        }

        _procDo() {
            for (const doProc of this._activeDoProcList) {
                doProc.execute()
            }
        }

        _procExit() {
            const next = this._lastTransition.to
            for (const exitProc of this._activeExitProcList) {
                exitProc.execute(next)
            }
        }

        _procTransit(): boolean {
            const transition = (() => {
                // trigger
                while (this._triggerQueue.length > 0) {
                    // transit
                    const trigger = this._triggerQueue.shift()
                    const transition = this._activeTransitionList.find((item) => item.trigger == trigger)
                    if (transition) {
                        return transition
                    }
                }
                // auto
                if (this._activeTrantisionAuto) {
                    return this._activeTrantisionAuto
                }
                return undefined
            })()
            if (transition) {
                this._lastTransition = transition
                return true
            } else {
                return false
            }
        }

        tick(): number {
            let interval = 0
            switch (this._proc) {
                case ProcId.None:
                    this._procNone()
                    interval = -1
                    break;
                case ProcId.Start:
                    if (this._procStartToInto()) {
                        this._proc = ProcId.Enter
                    } else {
                        this._proc = ProcId.None
                    }
                    break;
                case ProcId.Into:
                    if (this._procInto()) {
                        this._proc = ProcId.Enter
                    } else {
                        this._proc = ProcId.None
                    }
                    break;
                case ProcId.Enter:
                    this._procEnter()
                    this._proc = ProcId.Do
                    break;
                case ProcId.Do:
                    this._procDo()
                    this._proc = ProcId.Transit
                    break;
                case ProcId.Transit:
                    if (this._procTransit()) {
                        this._proc = ProcId.Exit
                    } else {
                        this._proc = ProcId.Do
                        if (this._activeDoProcList.length > 0) {
                            interval = 100
                        } else {
                            interval = -1
                        }
                    }
                    break;
                case ProcId.Exit:
                    this._procExit()
                    this._proc = ProcId.Into
                    break;
                default:
                    // panic
                    interval = -1
                    break;

            }
            return interval
        }

        start(initial: string): boolean {
            if (this._proc == ProcId.None) {
                this._proc = ProcId.Start
                this._initialState = initial
                return true
            } else {
                return false
            }
        }

        fire(trigger: string) {
            if (trigger.length > 0) {
                // queuing
                this._triggerQueue.push(trigger)
            }
        }

    }

    let stateMachine: StateMachine = new StateMachine("default sstate")

    const MICROBIT_CUSTOM_ID_BASE = 32768
    const TICK_EVENT_ID = MICROBIT_CUSTOM_ID_BASE + 100

    control.onEvent(TICK_EVENT_ID, EventBusValue.MICROBIT_EVT_ANY, function () {
        const index = control.eventValue()
        if (index == 0) {
            const interval = stateMachine.tick()
            if (interval >= 0) {
                basic.pause(interval)
                tickNext(index)
            }
        }
    })

    function tickNext(index: number) {
        control.raiseEvent(TICK_EVENT_ID, index)
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
        if (stateMachine.start(initial)) {
            tickNext(0)
        }
    }

    /**
     * fire trigger
     * @param trigger trigger name
     */
    //% block="fire trigger $trigger"
    //% weight=90
    //% group="Command"
    export function fire(trigger: string) {
        stateMachine.fire(trigger)
        tickNext(0)
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
        body(name)
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
        stateMachine.defineEntry(name, body)
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
        stateMachine.defineDo(name, interval, body)
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
        stateMachine.defineExit(name, body)
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
        stateMachine.defineTransition(name, trigger, to)
    }

}
