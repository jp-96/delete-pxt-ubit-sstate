/**
 * mstate blocks
 * icon: a Unicode identifier for an icon from the Font Awesome icon set.
 *       http://fontawesome.io/icons
 */
//% weight=100 color="#4C97FF" icon="\uf362"
//% groups="['Action', 'Command', 'Declare', 'Transition']"
namespace mstate {

    const STATE_FINAL = -2   // "*"(FINAL)
    const STATE_INITIAL = -1   // "*"(INITIAL)
    const TRIGGER_NONE = 0  // ""(completion)

    const MICROBIT_CUSTOM_ID_BASE = 32768
    const DEFAULT_UPDATE_EVENT_ID = MICROBIT_CUSTOM_ID_BASE + 100
    const DEFAULT_EVENT_LOOP_INTERVAL = 100

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
        // declare
        _state: number
        _ms: number
        _cb: () => void

        // callback tick
        _lastTick: number
        _nextTick: number
        _forceTick: boolean

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
            this._forceTick = true
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
            if (this._forceTick || (tick > this._nextTick)) {
                this._cb()
                this._forceTick = false
                this._lastTick = tick
                this._nextTick = tick + this._ms
            }
        }

        /**
         * force callback, execute DO
         */
        forceTick() {
            this._forceTick = true
        }
    }

    /**
     * ExitAction
     */
    class ExitAction {
        // declare
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
        // declare
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
        Idle,
        Start,
        Into,
        Enter,
        Do,
        Exit,
        Transit,
        Panic
    }

    enum ProcNext {
        Break,
        Loop,
        Event
    }

    class StateMachine {

        // system
        _machineId: number
        _initialized: boolean
        _updateEventId: number
        _eventLoopInterval: number
        _enabledUpdateEvent: boolean

        // declare
        _declareEntryActions: EntryAction[]
        _declareDoActions: DoAction[]
        _declareExitActions: ExitAction[]
        _declareTransitions: Transition[]

        // current state
        _state: number
        _entryActions: EntryAction[]
        _doActions: DoAction[]
        _exitActions: ExitAction[]
        _transitions: Transition[]
        _completionTransition: Transition

        // proc
        _defaultState: number
        _procNext: Procs

        // (Triggers[]) triggers
        _triggerQueue: number[]

        // current transition
        _transitFrom: number
        _transitTo: number

        /**
         * constructor
         * The state machine ID is used as the event value, so it must be greater than 0
         * @param id (Machines) state machine ID (>0)
         */
        constructor(id: number) {
            this._machineId = id
            this._initialized = false
            this._updateEventId = DEFAULT_UPDATE_EVENT_ID
            this._eventLoopInterval = DEFAULT_EVENT_LOOP_INTERVAL
            this._enabledUpdateEvent = false
            this._declareEntryActions = []
            this._declareDoActions = []
            this._declareExitActions = []
            this._declareTransitions = []
            this._state = STATE_INITIAL    // initial
            this._entryActions = []
            this._doActions = []
            this._exitActions = []
            this._transitions = []
            this._completionTransition = undefined
            this._defaultState = STATE_FINAL
            this._procNext = Procs.Idle
            this._triggerQueue = []
            this._transitFrom = STATE_FINAL  // terminate
            this._transitTo = STATE_INITIAL    // initial
        }

        get machineId() { return this._machineId }

        declareEntry(state: number, cb: (prev: number) => void) {
            const item = new EntryAction(state, cb)
            this._declareEntryActions.push(item)
        }

        declareDo(state: number, ms: number, cb: () => void) {
            const item = new DoAction(state, ms, cb)
            this._declareDoActions.push(item)
        }

        declareExit(state: number, cb: (next: number) => void) {
            const item = new ExitAction(state, cb)
            this._declareExitActions.push(item)
        }

        declareTransition(from: number, to: number, trigger: number) {
            const item = new Transition(from, to, trigger)
            this._declareTransitions.push(item)
        }

        _procStart() {
            this._transitFrom = STATE_INITIAL
            this._transitTo = this._defaultState
        }

        _procInto() {
            const next = this._transitTo
            // current state
            this._state = next
            this._entryActions = this._declareEntryActions.filter((item) => item.state == next)
            this._doActions = this._declareDoActions.filter((item) => {
                if (item.state == next) {
                    item.forceTick()
                    return true
                } else {
                    return false
                }
            })
            this._exitActions = this._declareExitActions.filter((item) => item.state == next)
            this._transitions = this._declareTransitions.filter((item) => item.from == next)
            this._completionTransition = this._transitions.find((item) => item.trigger == 0)
        }

        _procEnter() {
            const prev = this._transitFrom
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
            const next = this._transitTo
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
                this._transitFrom = transition.from
                this._transitTo = transition.to
                return true
            } else {
                return false
            }
        }

        _proc(): ProcNext {
            let ret = ProcNext.Loop // (default) loop
            switch (this._procNext) {
                case Procs.Idle:
                    ret = ProcNext.Break    // break
                    break;
                case Procs.Start:
                    this._procStart()
                    this._procNext = Procs.Into
                    ret = ProcNext.Event    // event, for start() function.
                    break;
                case Procs.Into:
                    this._procInto()
                    if (this._state < 0) {
                        this._procNext = Procs.Idle
                    } else {
                        this._procNext = Procs.Enter
                    }
                    break;
                case Procs.Enter:
                    this._procEnter()
                    this._procNext = Procs.Do
                    break;
                case Procs.Do:
                    this._procDo()
                    this._procNext = Procs.Transit
                    ret = ProcNext.Event    // event
                    break;
                case Procs.Transit:
                    if (this._procTransit()) {
                        this._procNext = Procs.Exit
                    } else {
                        this._procNext = Procs.Do
                    }
                    break;
                case Procs.Exit:
                    this._procExit()
                    this._procNext = Procs.Into
                    break;
                default:
                    // panic
                    this._procNext = Procs.Panic
                    ret = ProcNext.Break    // break
                    break;
            }
            return ret
        }

        _update() {
            let next: ProcNext
            do {
                next = this._proc()
            } while (next == ProcNext.Loop)
            this._enabledUpdateEvent = (next == ProcNext.Event)
        }

        _raiseUpdateEvent(force: boolean = false) {
            if (force || this._enabledUpdateEvent) {
                control.raiseEvent(this._updateEventId, this._machineId)
            }
        }

        _initialize() {
            if (!this._initialized) {
                this._initialized = true
                const inst: StateMachine = this
                // update event handler
                const updateEventId = this._updateEventId
                const machineId = this._machineId
                control.onEvent(updateEventId, machineId, function () {
                    inst._update()
                })
                // update event loop
                const eventLoopInterval = this._eventLoopInterval
                loops.everyInterval(eventLoopInterval, function () {
                    inst._raiseUpdateEvent()
                })
            }
        }

        start(state: number): boolean {
            this._initialize()
            if (this._procNext == Procs.Idle) {
                this._defaultState = state
                this._procNext = Procs.Start
                this._update()
                return true
            } else {
                return false
            }
        }

        fire(trigger: number) {
            // queuing
            this._triggerQueue.push(trigger)
            // update event
            this._raiseUpdateEvent(true)
        }
    }

    let mainStateMachine: StateMachine = new StateMachine(1)    // state machine ID is used as event value

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
     * declare state
     * @param arg state (States)
     * @param body code to run
     */
    //% block="declare $arg : $state"
    //% arg.shadow="state_enum_shim"
    //% draggableParameters="reporter"
    //% weight=140
    export function declareState(arg: number, body: (state: number) => void) {
        body(arg)
    }

    /**
     * declare ENTRY action.
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
    export function declareEntry(state: number, body: (prev: number) => void) {
        mainStateMachine.declareEntry(state, body)
    }

    /**
     * declare DO action.
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
    export function declareDo(state: number, ms: number, body: () => void) {
        mainStateMachine.declareDo(state, ms, body)
    }

    /**
     * declare EXIT action.
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
    export function declareExit(state: number, body: (next: number) => void) {
        mainStateMachine.declareExit(state, body)
    }

    /**
     * declare transition.
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
    export function declareTransition(from: number, to: number, trigger: number) {
        mainStateMachine.declareTransition(from, to, trigger)
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
        mainStateMachine.start(state)
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
        mainStateMachine.fire(trigger)
    }

}
