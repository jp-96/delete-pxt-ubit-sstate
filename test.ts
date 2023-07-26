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
sstate.declareState(States.Idle, function (state) {
    sstate.declareExit(state, function (next) {
        basic.showString("to:" + next + ">")
    })
    sstate.declareTransition(state, States.Blink2, Triggers.Completion)
})
sstate.declareState(States.Off, function (state) {
    sstate.declareEntry(state, function (prev) {
        basic.clearScreen()
    })
    sstate.declareTransition(state, States.On, Triggers.A)
})
sstate.declareState(States.On, function (state) {
    sstate.declareEntry(state, function (prev) {
        basic.showIcon(IconNames.Heart)
    })
    sstate.declareTransition(state, States.Blink, Triggers.A)
    sstate.declareTransition(state, States.Off, Triggers.B)
})
sstate.declareState(States.Blink, function (state) {
    sstate.declareEntry(state, function (prev) {
        blinkingState = 0
    })
    sstate.declareDo(state, 500, function () {
        if (1 == blinkingState) {
            led.setBrightness(200)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    })
    sstate.declareExit(state, function (next) {
        led.setBrightness(255)
    })
    sstate.declareTransition(state, States.Blink2, Triggers.A)
    sstate.declareTransition(state, States.Off, Triggers.B)
})
sstate.declareState(States.Blink2, function (state) {
    sstate.declareEntry(state, function (prev) {
        if (States.Idle == prev) {
            basic.showIcon(IconNames.Butterfly)
        }
        blinkingState = 0
    })
    sstate.declareDo(state, 100, function () {
        if (1 == blinkingState) {
            led.setBrightness(255)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    })
    sstate.declareExit(state, function (next) {
        led.setBrightness(255)
    })
    sstate.declareTransition(state, States.On, Triggers.A)
    sstate.declareTransition(state, States.Off, Triggers.B)
})
input.onButtonPressed(Button.A, function () {
    sstate.fire(Triggers.A)
})
input.onButtonPressed(Button.B, function () {
    sstate.fire(Triggers.B)
})
let blinkingState = 0
sstate.start(States.Idle)
