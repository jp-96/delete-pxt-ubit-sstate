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

    // tick scheduler
    const MICROBIT_CUSTOM_ID_BASE = 32768
    const DEFALUT_TICK_EVENT_ID = MICROBIT_CUSTOM_ID_BASE + 100
    let tickEventId = -1    // initialize: initialTickEventId(DEFALUT_TICK_EVENT_ID)

    function tickNext(machineId: number, nextTick: number) {
        if (tickEventId > 0) {
            const tick = control.millis()
            const delay = nextTick - tick
            if (delay > 0) {
                basic.pause(delay)
            }
            control.raiseEvent(tickEventId, machineId)
        }
    }

    /**
     * EntryAction
     */
    class EntryAction {
        _state: number
        _cb: (prev: number) => void

        /**
         * constructor
         * @param state (States) state
         * @param cb code to run
         */
        constructor(state: number, cb: (prev: number) => void) {
            this._state = state
            this._cb = cb
        }

        /**
         * (States) state
         */
        get state() { return this._state }

        /**
         * execute ENTRY
         * @param prev (States) previous state
         */
        execute(prev: number) { this._cb(prev) }
    }

    /**
     * DoAction
     */
    class DoAction {
        // define
        _state: number
        _ms: number
        _cb: () => void

        // callback tick
        _lastTick: number
        _nextTick: number
        _tickForce: boolean

        /**
         * constructor
         * @param state (States) state
         * @param ms interval (ms)
         * @param cb code to run
         */
        constructor(state: number, ms: number, cb: () => void) {
            this._state = state
            this._ms = ms
            this._cb = cb
            this._lastTick = control.millis()
            this._nextTick = this._lastTick
            this._tickForce = true
        }

        /**
         * (States) state
         */
        get state() { return this._state }

        /**
         * execute DO
         */
        execute() {
            const tick = control.millis()
            if (this._tickForce || (tick > this._nextTick)) {
                this._cb()
                this._tickForce = false
                this._lastTick = tick
                this._nextTick = tick + this._ms
            }
        }

        /**
         * force callback
         */
        forceTick() {
            this._tickForce = true
        }
    }

    /**
     * ExitAction
     */
    class ExitAction {
        // define
        _state: number
        _cb: (next: number) => void

        /**
         * constructor
         * @param state (States) state
         * @param cb code to run
         */
        constructor(state: number, cb: (next: number) => void) {
            this._state = state
            this._cb = cb
        }

        /**
         * (States) state
         */
        get state() { return this._state }

        /**
         * execute EXIT
         * @param next (States) next state
         */
        execute(next: number) { this._cb(next) }
    }

    /**
     * Transition
     */
    class Transition {
        // define
        _from: number
        _to: number
        _trigger: number

        /**
         * constructor
         * @param from (States) state, transition from
         * @param to (States) state, transition to
         * @param trigger (Triggers) trigger
         */
        constructor(from: number, to: number, trigger: number) {
            this._from = from
            this._to = to
            this._trigger = trigger
        }

        /**
         * (States) state, transition from
         */
        get from() { return this._from }

        /**
         * (States) state, transition to
         */
        get to() { return this._to }

        /**
         * (Triggers) trigger
         */
        get trigger() { return this._trigger }
    }

    enum Procs {
        Unproc,
        StartAndInto,
        Into,
        Enter,
        Do,
        Exit,
        Transit,
        Panic
    }

    class StateMachine {

        // define
        _id: number
        _defineEntryActions: EntryAction[]
        _defineDoActions: DoAction[]
        _defineExitActions: ExitAction[]
        _defineTransitions: Transition[]

        // current state
        _state: number
        _entryActions: EntryAction[]
        _doActions: DoAction[]
        _exitActions: ExitAction[]
        _transitions: Transition[]
        _completionTransition: Transition

        // proc
        _defaultState: number
        _proc: Procs

        // (Triggers[]) triggers
        _triggerQueue: number[]

        // current transition
        _lastTransition: Transition

        /**
         * constructor
         * @param id (Machines) state machine ID
         */
        constructor(id: number) {
            this._id = id
            this._defineEntryActions = []
            this._defineDoActions = []
            this._defineExitActions = []
            this._defineTransitions = []
            this._state = -1    // <0: initial, >=0: (States)
            this._entryActions = []
            this._doActions = []
            this._exitActions = []
            this._transitions = []
            this._completionTransition = undefined
            this._defaultState = -1
            this._proc = Procs.Unproc
            this._triggerQueue = []
            this._lastTransition = undefined
        }

        defineEntry(state: number, cb: (prev: number) => void) {
            const item = new EntryAction(state, cb)
            this._defineEntryActions.push(item)
        }

        defineDo(state: number, ms: number, cb: () => void) {
            const item = new DoAction(state, ms, cb)
            this._defineDoActions.push(item)
        }

        defineExit(state: number, cb: (next: number) => void) {
            const item = new ExitAction(state, cb)
            this._defineExitActions.push(item)
        }

        defineTransition(from: number, to: number, trigger: number) {
            const item = new Transition(from, to, trigger)
            this._defineTransitions.push(item)
        }

        _procNone() {
            // nop
        }

        _procStartToInto(): boolean {
            this._lastTransition = new Transition(-1, this._defaultState, -1)
            return this._procInto()
        }

        _procInto(): boolean {
            const next = this._lastTransition.to
            // current state
            this._state = next
            this._entryActions = this._defineEntryActions.filter((item) => item.state == next)
            this._doActions = this._defineDoActions.filter((item) => {
                if (item.state == next) {
                    item.forceTick()
                    return true
                } else {
                    return false
                }
            })
            this._exitActions = this._defineExitActions.filter((item) => item.state == next)
            this._transitions = this._defineTransitions.filter((item) => item.from == next)
            this._completionTransition = this._transitions.find((item) => item.trigger == 0)
            return (this._state >= 0)
        }

        _procEnter() {
            const prev = this._lastTransition.from
            for (const entryProc of this._entryActions) {
                entryProc.execute(prev)
            }
        }

        _procDo() {
            for (const doProc of this._doActions) {
                doProc.execute()
            }
        }

        _procExit() {
            const next = this._lastTransition.to
            for (const exitProc of this._exitActions) {
                exitProc.execute(next)
            }
        }

        _procTransit(): boolean {
            const transition = (() => {
                // trigger
                while (this._triggerQueue.length > 0) {
                    // transit
                    const trigger = this._triggerQueue.shift()
                    const transition = this._transitions.find((item) => item.trigger == trigger)
                    if (transition) {
                        return transition
                    }
                }
                // Completion Transition
                if (this._completionTransition) {
                    return this._completionTransition
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
            let interval = 0 // zero sleep
            switch (this._proc) {
                case Procs.Unproc:
                    this._procNone()
                    interval = -1   // none
                    break;
                case Procs.StartAndInto:
                    if (this._procStartToInto()) {
                        this._proc = Procs.Enter
                    } else {
                        this._proc = Procs.Unproc
                    }
                    break;
                case Procs.Into:
                    if (this._procInto()) {
                        this._proc = Procs.Enter
                    } else {
                        this._proc = Procs.Unproc
                    }
                    break;
                case Procs.Enter:
                    this._procEnter()
                    this._proc = Procs.Do
                    break;
                case Procs.Do:
                    this._procDo()
                    this._proc = Procs.Transit
                    break;
                case Procs.Transit:
                    if (this._procTransit()) {
                        this._proc = Procs.Exit
                    } else {
                        this._proc = Procs.Do
                        if (this._doActions.length > 0) {
                            interval = 100 // 100ms (tick)
                        } else {
                            interval = -1 // none
                        }
                    }
                    break;
                case Procs.Exit:
                    this._procExit()
                    this._proc = Procs.Into
                    break;
                default:
                    // panic
                    this._proc = Procs.Panic
                    interval = -1 // none
                    break;

            }
            return interval
        }

        start(state: number): boolean {
            if (this._proc == Procs.Unproc) {
                this._defaultState = state
                this._proc = Procs.StartAndInto
                return true
            } else {
                return false
            }
        }

        fire(trigger: number) {
            // queuing
            this._triggerQueue.push(trigger)
        }

    }

    let stateMachine: StateMachine = new StateMachine(0)

    function initialTickEventId(eventId: number) {
        if (tickEventId <= 0) {
            tickEventId = eventId
            control.onEvent(tickEventId, EventBusValue.MICROBIT_EVT_ANY, function () {
                const machineId = control.eventValue()
                if (machineId == 1) {
                    const interval = stateMachine.tick()
                    if (interval >= 0) {
                        const nextTick = control.millis() + interval
                        tickNext(machineId, nextTick)
                    }
                }
            })
        }
    }

    /**
     * States
     */
    //% shim=ENUM_GET
    //% blockId=state_enum_shim
    //% block="State $arg"
    //% enumName="States"
    //% enumMemberName="state"
    //% enumPromptHint="e.g. LED_On, LED_Off, LED_Blink ..."
    //% enumInitialMembers="Idle"
    export function _stateEnumShim(arg: number) {
        return arg;
    }

    /**
     * Triggers
     * notes: Triggers.Completion for the trigger, the transition is a Completion Transition.
     */
    //% shim=ENUM_GET
    //% blockId=trigger_enum_shim
    //% block="Trigger $arg"
    //% enumName="Triggers"
    //% enumMemberName="trigger"
    //% enumPromptHint="e.g. On, Off, Up, Down ..."
    //% enumInitialMembers="Completion"
    export function _triggerEnumShim(arg: number) {
        return arg;
    }

    /**
     * define state
     * @param arg state (States)
     * @param body code to run
     */
    //% block="define $arg : $state"
    //% arg.shadow="state_enum_shim"
    //% draggableParameters="reporter"
    //% weight=140
    export function defineState(arg: number, body: (state: number) => void) {
        body(arg)
    }

    /**
     * define ENTRY action.
     * prev is a previous state.
     * @param state state (States)
     * @param body code to run
     */
    //% block="on entry from $prev : $state"
    //% state.shadow="state_enum_shim"
    //% draggableParameters="reporter"
    //% handlerStatement
    //% weight=130
    //% group="Action"
    export function defineEntry(state: number, body: (prev: number) => void) {
        stateMachine.defineEntry(state, body)
    }

    /**
     * define DO action.
     * @param state state (States)
     * @param ms interval time (milliseconds)
     * @param body code to run
     */
    //% block="on do every $ms ms : $state"
    //% state.shadow="state_enum_shim"
    //% ms.shadow="timePicker"
    //% handlerStatement
    //% weight=120
    //% group="Action"
    export function defineDo(state: number, ms: number, body: () => void) {
        stateMachine.defineDo(state, ms, body)
    }

    /**
     * define EXIT action.
     * next is a next state.
     * @param state state (States)
     * @param body code to run
     */
    //% block="on exit to $next : $state"
    //% state.shadow="state_enum_shim"
    //% draggableParameters="reporter"
    //% handlerStatement
    //% weight=110
    //% group="Action"
    export function defineExit(state: number, body: (next: number) => void) {
        stateMachine.defineExit(state, body)
    }

    /**
     * define transition.
     * @param from state from (States)
     * @param to state to (States)
     * @param trigger trigger (Triggers)
     */
    //% block="trasition to $to when $trigger occur : $from"
    //% from.shadow="state_enum_shim"
    //% to.shadow="state_enum_shim"
    //% trigger.shadow="trigger_enum_shim"
    //% weight=100
    //% group="Transition"
    export function defineTransition(from: number, to: number, trigger: number) {
        stateMachine.defineTransition(from, to, trigger)
    }

    /**
     * start state machine
     * @param state default state (States)
     */
    //% block="start $state"
    //% state.shadow="state_enum_shim"
    //% weight=80
    //% group="Command"
    export function start(state: number) {
        initialTickEventId(DEFALUT_TICK_EVENT_ID)
        if (stateMachine.start(state)) {
            const machineId = 1
            tickNext(machineId, -1)
        }
    }

    /**
     * fire trigger
     * @param trigger trigger (Triggers)
     */
    //% block="fire $trigger"
    //% trigger.shadow="trigger_enum_shim"
    //% weight=90
    //% group="Command"
    export function fire(trigger: number) {
        stateMachine.fire(trigger)
        const machineId = 1
        tickNext(machineId, -1)
    }

}
