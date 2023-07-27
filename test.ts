// tests go here; this will not be compiled when this package is used as an extension.

mstate.declareState("Idle", function (state) {
    mstate.declareExit(state, function (next) {
        basic.showString("to:" + next + ">")
    })
    mstate.declareTransition(state, "Blink2", "")
})
mstate.declareState("Off", function (state) {
    mstate.declareEntry(state, function (prev) {
        basic.clearScreen()
    })
    mstate.declareTransition(state, "On", "A")
})
mstate.declareState("On", function (state) {
    mstate.declareEntry(state, function (prev) {
        basic.showIcon(IconNames.Heart)
    })
    mstate.declareTransition(state, "Blink", "A")
    mstate.declareTransition(state, "Off", "B")
})
mstate.declareState("Blink", function (state) {
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
    mstate.declareTransition(state, "Blink2", "A")
    mstate.declareTransition(state, "Off", "B")
})
mstate.declareState("Blink2", function (state) {
    mstate.declareEntry(state, function (prev) {
        if ("Idle" == prev) {
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
    mstate.declareTransition(state, "On", "A")
    mstate.declareTransition(state, "Off", "B")
})
input.onButtonPressed(Button.A, function () {
    mstate.fire("A")
})
input.onButtonPressed(Button.B, function () {
    mstate.fire("B")
})
let blinkingState = 0
mstate.start("Idle")
