// tests go here; this will not be compiled when this package is used as an extension.
enum States {
    Idle,
    Off,
    On,
    Blink,
    Blink2
}
enum Triggers {
    Completion,
    A,
    B
}
mstate.declareState(States.Idle, function (state) {
    mstate.declareExit(state, function (next) {
        basic.showString("to:" + next + ">")
    })
    mstate.declareTransition(state, States.Blink2, Triggers.Completion)
})
mstate.declareState(States.Off, function (state) {
    mstate.declareEntry(state, function (prev) {
        basic.clearScreen()
    })
    mstate.declareTransition(state, States.On, Triggers.A)
})
mstate.declareState(States.On, function (state) {
    mstate.declareEntry(state, function (prev) {
        basic.showIcon(IconNames.Heart)
    })
    mstate.declareTransition(state, States.Blink, Triggers.A)
    mstate.declareTransition(state, States.Off, Triggers.B)
})
mstate.declareState(States.Blink, function (state) {
    mstate.declareEntry(state, function (prev) {
        blinkingState = 0
    })
    mstate.declareDo(state, 500, function () {
        if (1 == blinkingState) {
            led.setBrightness(200)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    })
    mstate.declareExit(state, function (next) {
        led.setBrightness(255)
    })
    mstate.declareTransition(state, States.Blink2, Triggers.A)
    mstate.declareTransition(state, States.Off, Triggers.B)
})
mstate.declareState(States.Blink2, function (state) {
    mstate.declareEntry(state, function (prev) {
        if (States.Idle == prev) {
            basic.showIcon(IconNames.Butterfly)
        }
        blinkingState = 0
    })
    mstate.declareDo(state, 100, function () {
        if (1 == blinkingState) {
            led.setBrightness(255)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    })
    mstate.declareExit(state, function (next) {
        led.setBrightness(255)
    })
    mstate.declareTransition(state, States.On, Triggers.A)
    mstate.declareTransition(state, States.Off, Triggers.B)
})
input.onButtonPressed(Button.A, function () {
    mstate.fire(Triggers.A)
})
input.onButtonPressed(Button.B, function () {
    mstate.fire(Triggers.B)
})
let blinkingState = 0
mstate.start(States.Idle)
