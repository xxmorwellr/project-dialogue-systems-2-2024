# Report on Project for Dialogue System 2
## Motivation and Background
In previous coursework, I have realized chit-chatting with LLMs. This time I want to explore the dialogue capacities of LLMs within a landing senario, with a focus on how the model can involve local (custom) knowledge. Since I really enjoy fika time in Sweden, I want to imitate a role-playing dialogue between a barista and a customer.


## Data Collection  
I initially wanted to incorporate map api to fetch coffee shop overview and detailed menu. But in exploration I found issues about...
 - API limitation: *Google Maps API* is focusing on location and route planning while *Google Places API* is focusing on nearby searching with specific types (e.g., "bakery", "cafe") or text searching. If you want to fetch detailed menu, you should involve *Yelp Fusion API*.
 - Call Synchronization: It's tricky to ensure that the system calls LLM after data fetching is complete. Considering that this is a lightweight project, it is more efficient to access the data as a local file.  
 
 At last, I collected data by handcraft (`store_menu`) and focused on ordering senario.

As shown in the slides, I selected the local coffe shop chain *Espresso House* as my landing senario and summarized its SOP by obsersvation. 


## Implementation
### Model Selection
I chose *Llama 3.1* as my dialogue model and adjusted parameters like *temperature* and *repeat_penalty* to adapt it to this task. Furthermore, I also tried other models like *Gemma 2*.

### Prompt
I utilized *ChatGPT* to generate specific prompts for me. I divided it into 3 main parts: `Role`, `Persona` and `Objective`. Additonally, I added SOP to let it "understand" the workflow.  
To emphsize the verbal senario, I also constrained its generative style to avoid markdown syntax and long answers.

### Run-down Control
- Hardcoded greeting
- Call Llama with `role_prompt` + `store_menu` + previous dialogues


## Example Dialogues
**Customer**: Could you recommend me some hot drinks on your store’s menu?  
**Barista**: Our most popular one is the Caffe Latte. It's made with high-quality espresso and steamed milk, perfect for a cozy moment. Or if you prefer something a bit stronger, our Cappuccino is also very popular - it has a nice balance of coffee and milk. Would you like to try either of those?  
**Customer**: Well, I want to try Caffe Latte   
**Barista**: Our Caffe Latte is a classic choice. Now, would you prefer it small or standard size? And which type of milk would you like: milk, milk lactose free, soy drink, oat milk, or coconut milk? Also, do you want any syrup with that? We have vanilla, caramel, and mocka options.  
…  
**Customer**: How much in total?  
**Barista**: A standard size Caffe Latte is 54 SEK, and a Chocolate Ball is 39 SEK. So the total comes out to be 93 SEK. Would you like to have it take away or here with us? And by the way, do you want any customizations for your coffee?  


## Challenges and Evaluation
### About Role-playing
- It sometimes forgets its role and says "I’m just a text-based AI"…   
=> Sloved by setting its role from the beginning
- It still performs not verbal enough...current LLMs are more applicable in text communication.

### About Accuarcy
- Regarding utilizing local knowledge, it performs more like “searching” instead of “matching”: It can tell you the correct price corresponding to the input menu, even calculate the total price correctly most of the time.  
- However, it still makes up some custom options that are not in the menu even if it has been prompted not to do so. For example, for *flat white* we just have one size, and it still asks if you want "small" or "standard" size.

### About Fluency
- Respond quickly…but
- It often forgot what "I" have ordered before?
- Tend to enter an infinite loop?

## Future Work and Inspiration by classmates
Limited by time and energy, I cannot hone my dialogue system perfectly. But I have summarized some directions that I hope to achieve in future work:

### Adjusting model parameters/ Prompt engineering/ Dialogue Distillation
e.g., CO-STAR framework

### Advanced methods of incorporating custom knowledge
- RAG with LangChain framework /GraphRAG with Knowledege Graph(KG)
- Third-party api like AnythingLLM
- Agent

### Multimodal inputs & outputs
- For landing application, it is better to combine multi-modal outputs, such as social robots like *Furhat*(depends on specific scenarios)
- Verbal vs. Non-verbal: generate structured output, such as, parse a JSON file and visualize it as a table?  

For the issue of lacking of memory, I am also inspired by Anni and Tianyi's presentation: incorporating more state shifts could be a solution.