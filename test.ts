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

sstate.defineState(States.Idle, function (state) {
    sstate.defineExit(state, function (next) {
        basic.showString("to:" + next + ">")
    })
    sstate.defineTransition(state, States.Off, Triggers.Completion)
})
sstate.defineState(States.Off, function (state) {
    sstate.defineEntry(state, function (prev) {
        basic.clearScreen()
        // // Workaround: runtime error (020)
        // basic.showLeds(`
        //     . . . . .
        //     . . . . .
        //     . . . . .
        //     . . . . .
        //     . . . . .
        //     `)
    })
    sstate.defineTransition(state, States.On, Triggers.A)
})
sstate.defineState(States.On, function (state) {
    sstate.defineEntry(state, function (prev) {
        basic.showIcon(IconNames.Heart)
    })
    sstate.defineTransition(state, States.Blink, Triggers.A)
    sstate.defineTransition(state, States.Off, Triggers.B)
})
sstate.defineState(States.Blink, function (state) {
    sstate.defineTransition(state, States.Blink2, Triggers.A)
    sstate.defineTransition(state, States.Off, Triggers.B)
    sstate.defineEntry(state, function (prev) {
        blinkingState = 0
    })
    sstate.defineDo(state, function () {
        if (1 == blinkingState) {
            led.setBrightness(200)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    }, 500)
    sstate.defineExit(state, function (next) {
        led.setBrightness(255)
    })
})
sstate.defineState(States.Blink2, function (state) {
    sstate.defineTransition(state, States.On, Triggers.A)
    sstate.defineTransition(state, States.Off, Triggers.B)
    sstate.defineEntry(state, function (prev) {
        blinkingState = 0
    })
    sstate.defineDo(state, function () {
        if (1 == blinkingState) {
            led.setBrightness(255)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    }, 100)
    sstate.defineExit(state, function (next) {
        led.setBrightness(255)
    })
})
input.onButtonPressed(Button.A, function () {
    sstate.fire(Triggers.A)
})
input.onButtonPressed(Button.B, function () {
    sstate.fire(Triggers.B)
})
let blinkingState = 0
sstate.start(States.Off)
