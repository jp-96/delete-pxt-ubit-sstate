// tests go here; this will not be compiled when this package is used as an extension.
sstate.defineState("init", function (stateName) {
    sstate.defineExit(stateName, function (nextName) {
        basic.showString("to:" + nextName +">")
    })
    sstate.defineTransition(stateName, "", "off")
})
sstate.defineState("off", function (stateName) {
    sstate.defineEntry(stateName, function (prevName) {
        // basic.clearScreen()
        // Workaround: runtime error (020)
        basic.showLeds(`
        . . . . .
        . . . . .
        . . . . .
        . . . . .
        . . . . .
        `)
    })
    sstate.defineTransition(stateName, "a", "on")
})
sstate.defineState("on", function (stateName) {
    sstate.defineEntry(stateName, function (prevName) {
        basic.clearScreen()
        basic.showIcon(IconNames.Heart)
    })
    sstate.defineTransition(stateName, "a", "blink")
    sstate.defineTransition(stateName, "b", "off")
})
sstate.defineState("blink", function (stateName) {
    sstate.defineTransition(stateName, "a", "on")
    sstate.defineTransition(stateName, "b", "off")
    sstate.defineEntry(stateName, function (prevName) {
        blinkingState = 0
    })
    sstate.defineDo(stateName, 100, function () {
        if (1 == blinkingState) {
            led.setBrightness(255)
            blinkingState = 0
        } else {
            led.setBrightness(100)
            blinkingState = 1
        }
    })
    sstate.defineExit(stateName, function (nextName) {
        led.setBrightness(255)
        basic.clearScreen()
    })
})

input.onButtonPressed(Button.A, function () {
    sstate.fire("a")
})
input.onButtonPressed(Button.B, function () {
    sstate.fire("b")
})

let blinkingState = 0
sstate.start("init")
