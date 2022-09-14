// Reference: https://www.arduino.cc/reference/en/language/functions/usb/keyboard/keyboardmodifiers/

const getSpecialKeyCode = (key: string) => {
  let result: number = 0;

  switch (key) {
    case "ControlLeft":
      result = 128;
      break;
    case "ShiftLeft":
      result = 129;
      break;
    case "AltLeft":
      result = 130;
      break;
    case "MetaLeft":
      result = 131;
      break;
    case "ControlRight":
      result = 132;
      break;
    case "ShiftRight":
      result = 133;
      break;
    case "AltRight":
      result = 134;
      break;
    case "MetaRight":
      result = 135;
      break;
    case "Return":
      result = 176;
      break;
    case "Tab":
      result = 179;
      break;
    case "Backspace":
      result = 178;
      break;
    case "CapsLock":
      result = 193;
      break;
    case "Menu":
      result = 237;
      break;
    case "Insert":
      result = 209;
      break;
    case "Home":
      result = 210;
      break;
    case "PageUp":
      result = 211;
      break;
    case "Delete":
      result = 212;
      break;
    case "End":
      result = 213;
      break;
    case "PageDown":
      result = 214;
      break;
    case "RightArrow":
      result = 215;
      break;
    case "LeftArrow":
      result = 216;
      break;
    case "DownArrow":
      result = 217;
      break;
    case "UpArrow":
      result = 218;
      break;
    case "NumLock":
      result = 219;
      break;
    case "NumpadDivide":
      result = 220;
      break;
    case "NumpadMultiply":
      result = 221;
      break;
    case "NumpadSubtract":
      result = 222;
      break;
    case "NumpadAdd":
      result = 223;
      break;
    case "NumpadEnter":
      result = 224;
      break;
    case "Numpad1":
      result = 225;
      break;
    case "Numpad2":
      result = 226;
      break;
    case "Numpad3":
      result = 227;
      break;
    case "Numpad4":
      result = 228;
      break;
    case "Numpad5":
      result = 229;
      break;
    case "Numpad6":
      result = 230;
      break;
    case "Numpad7":
      result = 231;
      break;
    case "Numpad8":
      result = 232;
      break;
    case "Numpad9":
      result = 233;
      break;
    case "Numpad0":
      result = 234;
      break;
    case "NumpadDecimal":
      result = 235;
      break;
    case "Escape":
      result = 177;
      break;
    case "F1":
      result = 194;
      break;
    case "F2":
      result = 195;
      break;
    case "F3":
      result = 196;
      break;
    case "F4":
      result = 197;
      break;
    case "F5":
      result = 198;
      break;
    case "F6":
      result = 199;
      break;
    case "F7":
      result = 200;
      break;
    case "F8":
      result = 201;
      break;
    case "F9":
      result = 202;
      break;
    case "F10":
      result = 203;
      break;
    case "F11":
      result = 204;
      break;
    case "F12":
      result = 205;
      break;
    case "F13":
      result = 240;
      break;
    case "F14":
      result = 241;
      break;
    case "F15":
      result = 242;
      break;
    case "F16":
      result = 243;
      break;
    case "F17":
      result = 244;
      break;
    case "F18":
      result = 245;
      break;
    case "F19":
      result = 246;
      break;
    case "F20":
      result = 247;
      break;
    case "F21":
      result = 248;
      break;
    case "F22":
      result = 249;
      break;
    case "F23":
      result = 250;
      break;
    case "F24":
      result = 251;
      break;
    case "PrintScreen":
      result = 206;
      break;
    case "ScrollLock":
      result = 207;
      break;
    case "Pause":
      result = 208;
      break;
  }

  return result;
};

const checkSpecialKey = (key: number) => {
  let result: string = "";

  switch (key) {
    case 128:
      result = "LCtrl";
      break;
    case 129:
      result = "LShift";
      break;
    case 130:
      result = "LAlt";
      break;
    case 131:
      result = "LMeta";
      break;
    case 132:
      result = "RCtrl";
      break;
    case 133:
      result = "RShift";
      break;
    case 134:
      result = "RAlt";
      break;
    case 135:
      result = "RMeta";
      break;
    case 176:
      result = "Return";
      break;
    case 179:
      result = "Tab";
      break;
    case 178:
      result = "Backspace";
      break;
    case 193:
      result = "CapsLock";
      break;
    case 237:
      result = "Menu";
      break;
    case 209:
      result = "Insert";
      break;
    case 210:
      result = "Home";
      break;
    case 211:
      result = "PageUp";
      break;
    case 212:
      result = "Delete";
      break;
    case 213:
      result = "End";
      break;
    case 214:
      result = "PageDown";
      break;
    case 215:
      result = "RightArrow";
      break;
    case 216:
      result = "LeftArrow";
      break;
    case 217:
      result = "DownArrow";
      break;
    case 218:
      result = "UpArrow";
      break;
    case 219:
      result = "NumLock";
      break;
    case 220:
      result = "Keypad /";
      break;
    case 221:
      result = "Keypad *";
      break;
    case 222:
      result = "Keypad -";
      break;
    case 223:
      result = "Keypad +";
      break;
    case 224:
      result = "Keypad Enter";
      break;
    case 225:
      result = "Keypad 1";
      break;
    case 226:
      result = "Keypad 2";
      break;
    case 227:
      result = "Keypad 3";
      break;
    case 228:
      result = "Keypad 4";
      break;
    case 229:
      result = "Keypad 5";
      break;
    case 230:
      result = "Keypad 6";
      break;
    case 231:
      result = "Keypad 7";
      break;
    case 232:
      result = "Keypad 8";
      break;
    case 233:
      result = "Keypad 9";
      break;
    case 234:
      result = "Keypad 0";
      break;
    case 235:
      result = "Keypad .";
      break;
    case 177:
      result = "Escape";
      break;
    case 194:
      result = "F1";
      break;
    case 195:
      result = "F2";
      break;
    case 196:
      result = "F3";
      break;
    case 197:
      result = "F4";
      break;
    case 198:
      result = "F5";
      break;
    case 199:
      result = "F6";
      break;
    case 200:
      result = "F7";
      break;
    case 201:
      result = "F8";
      break;
    case 202:
      result = "F9";
      break;
    case 203:
      result = "F10";
      break;
    case 204:
      result = "F11";
      break;
    case 205:
      result = "F12";
      break;
    case 240:
      result = "F13";
      break;
    case 241:
      result = "F14";
      break;
    case 242:
      result = "F15";
      break;
    case 243:
      result = "F16";
      break;
    case 244:
      result = "F17";
      break;
    case 245:
      result = "F18";
      break;
    case 246:
      result = "F19";
      break;
    case 247:
      result = "F20";
      break;
    case 248:
      result = "F21";
      break;
    case 249:
      result = "F22";
      break;
    case 250:
      result = "F23";
      break;
    case 251:
      result = "F24";
      break;
    case 206:
      result = "PrintScreen";
      break;
    case 207:
      result = "ScrollLock";
      break;
    case 208:
      result = "Pause";
      break;
  }

  return result;
};

export { getSpecialKeyCode, checkSpecialKey };
