import { AnyActorRef, assign, createActor, fromPromise, setup } from "xstate";
import { speechstate, SpeechStateExternalEvent } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";

/*connect mltgpu's ollama'*/
// ssh -f -N -L 11434:127.0.0.1:11434 mltgpu
// ssh -N -L 11434:localhost:11434 mltgpu

const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings = {
  azureRegion: "northeurope",
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "en-US",
  // ttsDefaultVoice: "en-US-DavisNeural",
  ttsDefaultVoice: "en-US-AvaNeural"
};

/* Grammar definition */
// interface Grammar {
//   [index: string]: { person?: string; day?: string; time?: string };
// }
// const grammar: Grammar = {
//   vlad: { person: "Vladislav Maraev" },
//   aya: { person: "Nayat Astaiza Soriano" },
//   rasmus: { person: "Rasmus Blanck" },
//   monday: { day: "Monday" },
//   tuesday: { day: "Tuesday" },
//   "10": { time: "10:00" },
//   "11": { time: "11:00" },
// };

/* Helper functions */
// function isInGrammar(utterance: string) {
//   return utterance.toLowerCase() in grammar;
// }

// function getPerson(utterance: string) {
//   return (grammar[utterance.toLowerCase()] || {}).person;
// }

const greeting = `Hello! Welcome to Espresso House! We have a variety of options, from our smooth lattes and rich espressos to unique Nordic treats. Could I help you choose something to suit your taste?`
const role_prompt = `
# Role
You are a barista at Espresso House, a Nordic coffeehouse brand known for its cozy atmosphere, high-quality coffee, and locally inspired menu. Your goal is to warmly welcome customers visiting for the first time and recommend menu items that match their tastes and preferences. 

# Persona
You are friendly, approachable, and passionate about coffee and Nordic-inspired treats. You know the Espresso House menu well, including details about the coffee beans, specialty drinks, pastries, and seasonal offerings.

# Objective
Engage in a natural conversation with the customer, ask about their preferences (e.g., flavor, coffee strength, dietary restrictions), and suggest items that could make their visit memorable. 
Make sure keep your answer short and avoid non-verbal expressions like listing point statements and the abbreviations including 'e.g.' and 'SEK'.
Try not ask too many questions in one turn.

# Order SOP
When one item is selected, do not hesitate to ask custom options, you need to confirm if the customer needs anything else.
When the customer does not need anything else, you need to ask pick up options: "take away" or "at our place", and to confirm pay method. Besides, to ask if the customer has a membership barcode is better. One order can return one fika point.
After that, you don't need to ask for demands more, just say "thank you" and end the conversation. Don't enter into the endless order loop.

# Menu
The store menu is provided in JSON format(the price is in SEK), please provide options according to its content, not to make up anything that doesn't exist in the menu.
The price given for Caffe Latte is for the small size, with the standard size being 5 SEK more expensive.

# Generative style
The dialogue is based on verbal communication, please make your answer short and easy to understand. Do not generate text with markdown syntax, such as asterisks and action descriptions enclosed in brackets.
`

const store_menu = [
  { "item": "Cinnamon Bun", "type": "Pastries", "price": 39 },
  { "item": "Croissant", "type": "Pastries", "price": 39 },
  { "item": "Chocolate Ball", "type": "Pastries", "price": 39 },
  { "item": "Ice Latte", 
    "type": "Cold drinks",
    "price": 49,
    "customizations": { 
      "size":["Small", "Standard"],
      "milk":["Milk", "Milk lactose free", "Soy drink", "Oat milk", "Coconut Milk"],
      "syrups": ["", "vanilla", "caramel", "mocka"],
      // "extra_shot": ["", 1]
    }
  },
  { "item": "Caffe Latte", 
    "type": "Hot drinks", 
    "price": 49,
    "customizations": { 
      "size":["Small", "Standard"],
      "milk":["Milk", "Milk lactose free", "Soy drink", "Oat milk", "Coconut Milk"],
      "syrups": ["", "vanilla", "caramel"]
    }
  },
  { "item": "Cappuccino", 
    "type": "Hot drinks", 
    "price": 57,
    "customizations": { 
      "milk":["Milk", "Milk lactose free", "Soy drink", "Oat milk", "Coconut Milk"],
      "syrups": ["", "vanilla", "caramel"]
    } 
  },
  { "item": "Flat White", 
    "type": "Hot drinks",
    "price": 54,
    "customizations": { 
      "milk":["Milk", "Milk lactose free", "Soy drink", "Oat milk", "Coconut Milk"],
      "syrups": ["", "vanilla", "caramel"]
    } 
  }
]


/* Intoduce Message into context */
interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];
  messages: Message[];
}

interface DMContext {
  count: number;
  ssRef: AnyActorRef;
}
        
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
  guards: {
    noinputCounterMoreThanTwo: ({ context }) => {
      if (context.noinputCounter > 2) {
        return true;
      } else {
        return false;
      }
    },
    noinputCounterMoreThanOne: ({ context }) => {
      if (context.noinputCounter > 1) {
        return true;
      } else {
        return false;
      }
    },
  },
  actions: {
    /* define your actions here */
    speechstate_prepare: ({ context }) =>
      context.ssRef.send({ type: "PREPARE" }),
    speechstate_listen: ({ context }) => context.ssRef.send({ type: "LISTEN" }),
    speechstate_speak: ({ context }, params: { value: string }) =>
      context.ssRef.send({ type: "SPEAK", value: { utterance: params.value } }),
    debug: () => console.debug("blabla"),
    assign_noinputCounter: assign(({ context }, params?: { value: number }) => {
      if (!params) {
        return { noinputCounter: context.noinputCounter + 1 };
      }
      return { noinputCounter: context.noinputCounter + params.value };
    }),
  },
  actors: {
    get_ollama_models: fromPromise<any, null>(async () => {
      return fetch("http://localhost:11434/api/tags").then((response) =>
        response.json()
      );
    }),
    fetchCompletions: fromPromise( 
      async ({ input }: { input: { messages: Message[] } }) => {
      const body = {
        model: "llama3.1", // gemma2
        stream: false,
        /* adjust parameters */
        temperature: 0.6, // default 0.8; Increasing the temperature will make the model answer more creatively.
        repeat_penalty: 1.5, // default 1.1; Sets how strongly to penalize repetitions. A higher value (e.g., 1.5) will penalize repetitions more strongly, while a lower value (e.g., 0.9) will be more lenient.
        top_k: 40, // default 40; A higher value (e.g. 100) will give more diverse answers, while a lower value (e.g. 10) will be more conservative.
        top_p: 0.9, // default 0.9; Works together with top-k. A higher value (e.g., 0.95) will lead to more diverse text, while a lower value (e.g., 0.5) will generate more focused and conservative text. 
        messages: input.messages
      };
      console.log("Sending messages to Llama model:", body.messages); // Log the messages
      return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
    })
}}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    ssRef: spawn(speechstate, { input: settings }),
    noinputCounter: 0,
    messages: [],
    // moreStuff: {thingOne: 1, thingTwo: 2}
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: [{ type: "speechstate_prepare" }],
      on: { ASRTTS_READY: "WaitToStart" },
    },
    WaitToStart: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
    PromptAndAsk: {
      initial: "GetModels",
      states: {
        GetModels: {
          invoke: {
            src: "get_ollama_models",
            input: null,
            onDone: {
              target: "Prompt",
              actions: assign(({ event }) => {
                console.log(event.output);
                return {
                  availableModels: event.output.models.map((m: any) => m.name),
                  messages: [
                    { role: "system", content: role_prompt + JSON.stringify(store_menu) } // Initialization
                  ]
                };
              }),
            },
            onError: {
              actions: () => console.error("no models available"),
            },
          },
        },
        Prompt: {
          entry: {
            type: "speechstate_speak",
            params: () => ({
              value: greeting
            }),
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        NoInput: {
          initial: "Choice",
          states: {
            Choice: {
              always: [
                { guard: "noinputCounterMoreThanTwo", target: "#DM.PromptAndAsk.Stopped" }, // add new check rule
                { guard: "noinputCounterMoreThanOne", target: "MoreThanOne" },
                { target: "LessThanOne" },
              ],
            },
            LessThanOne: {
              entry: {
                type: "speechstate_speak",
                params: { value: "I didn't hear you" },
              },
            },
            MoreThanOne: {
              entry: {
                type: "speechstate_speak",
                params: ({ context }) => {
                  return {
                    value: `I didn't hear you ${context.noinputCounter} times`,
                  };
                },
              },
            },
          },
          on: { SPEAK_COMPLETE: "Ask" },
        },
        Stopped: {
          entry: {
            type: "speechstate_speak",
            params: { value: `I didn't hear you 3 times. I'm stopping now due to no input.`}, 
          },
          on: {
            SPEAK_COMPLETE: "#DM.Done" 
          },
        },
        Ask: {
          entry: [
            { type: "speechstate_listen" },
            () => console.log("Enter the Ask state, wait for user input...")
          ],
          on: {
            ASR_NOINPUT: {
              target: "NoInput",
              actions: { type: "assign_noinputCounter" },
            },
            RECOGNISED: {
              target: "CallLlama",
              actions: assign({
                messages: ({ context, event }) => {

                  // Make sure the extracted utterance is not undefined
                  const userUtterance = (event as any)?.value?.[0]?.utterance;

                  if (!userUtterance) {
                    console.warn("Utterance is undefined, returning current messages.");
                    return context.messages // If there is no utterance, return the original messages
                  }

                  console.log("Extracted utterance:", userUtterance);

                  return [
                    ...context.messages,
                    { role: "user", content: userUtterance } as Message,
                  ]
                }
              })
            },
          },
        },
        CallLlama: {
          invoke: {
            src: "fetchCompletions",
            input: ({ context }) => ({ messages: context.messages }),
            onDone: {
              actions: [
                assign({
                  messages: ({ context, event }) => [
                    { role: "system", content: role_prompt + JSON.stringify(store_menu) }, // add role_prompt, JSON.stringify() JSON.parse()
                    ...context.messages,
                    { role: "assistant", content: event.output.message.content } as Message
                  ]
                }),
                () => console.log("Llama responded successfully, ready to speak..."),
                {
                  type: "speechstate_speak",
                  params: ({ event }) => ({
                    value: event.output.message.content,
                  }),
                },
              ],
              target: "WaitingForCallLlamaComplete",
            },
            onError: {
              actions: [
                {
                  type: "speechstate_speak",
                  params: { value: "Sorry, I'm having trouble calling Llama." },
                },
              ],
              target: "Ask",
            }
          },
        },
        WaitingForCallLlamaComplete: {
          on: {
            SPEAK_COMPLETE: "Ask"
          }
        },
      }
    },
    Done: {
      on: {
        CLICK: "PromptAndAsk",
      },
    },
    },
});

const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();


dmActor.subscribe((state) => {

  // console.log("Current state:", state); 

  const dialogContent = document.getElementById("dialog-content");
  if (dialogContent) {
   
    dialogContent.innerHTML = "";

    // fetch messages
    const messages = (state.context as MyDMContext).messages; 

    // add hardcoded greeting
    let isGreetingDisplayed = false;

    if (!isGreetingDisplayed) {
      const greetingDiv = document.createElement("div");
      greetingDiv.classList.add("message");
      greetingDiv.innerHTML = `<strong>Barista: </strong>${greeting}`;
      dialogContent.appendChild(greetingDiv);

      isGreetingDisplayed = true;
    }

    if (Array.isArray(messages)) {
      // iterate each message and add it to the frontend
      messages.forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          const messageDiv = document.createElement("div");
          messageDiv.classList.add("message");

          // replace display name based on role
          let displayRole = msg.role === "user" ? "Customer" : "Barista";
          messageDiv.innerHTML = `<strong>${displayRole}:</strong> ${msg.content}`;
          dialogContent.appendChild(messageDiv);
        }
      });

    } else {
      console.error("Messages is not an array:", messages);
    }
  }
});

export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {
    dmActor.send({ type: "CLICK" });
  });
}