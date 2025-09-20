public static class DbInitializer
{
    public static void Initialize(AppDbContext context)
    {
        context.Database.EnsureCreated();

        // Check if "React" domain already exists
        if (context.Domains.Any(d => d.Name == "React"))
        {
            return; // DB has been seeded
        }

        // Create the domain
        var reactDomain = new Domain
        {
            Name = "React"
        };

        context.Domains.Add(reactDomain);
        context.SaveChanges(); // Save to get the generated ID

        var questions = new InterviewQuestion[]
        {
            // Difficulty E (Easiest) - React Questions
            new InterviewQuestion
            {
                Text = "What is React and what are its core features?",
                IdealAnswer = "React is a JavaScript library for building user interfaces. Core features include: components, virtual DOM, JSX syntax, unidirectional data flow, and reusable UI components.",
                Difficulty = Difficulty.E,
                DomainId = reactDomain.Id
            },
            new InterviewQuestion
            {
                Text = "What are React components?",
                IdealAnswer = "Components are independent, reusable pieces of UI that return React elements describing what should appear on the screen. They can be class-based or functional.",
                Difficulty = Difficulty.E,
                DomainId = reactDomain.Id
            },

            // Difficulty D - React Questions
            new InterviewQuestion
            {
                Text = "Explain the difference between state and props in React.",
                IdealAnswer = "Props are read-only data passed from parent to child components. State is mutable data managed within the component. Props are like function parameters, state is like variables declared in the function body.",
                Difficulty = Difficulty.D,
                DomainId = reactDomain.Id
            },
            new InterviewQuestion
            {
                Text = "What are React hooks? Name some commonly used ones.",
                IdealAnswer = "Hooks are functions that let you use state and other React features in functional components. Common hooks: useState, useEffect, useContext, useReducer, useCallback, useMemo, useRef.",
                Difficulty = Difficulty.D,
                DomainId = reactDomain.Id
            },

            // Difficulty C - React Questions
            new InterviewQuestion
            {
                Text = "Explain the virtual DOM and how it improves performance.",
                IdealAnswer = "The virtual DOM is a lightweight copy of the real DOM. React compares the virtual DOM with a previous version to determine minimal updates needed (reconciliation), then batches these updates to the real DOM, reducing expensive direct manipulations.",
                Difficulty = Difficulty.C,
                DomainId = reactDomain.Id
            },
            new InterviewQuestion
            {
                Text = "What is JSX and how does it differ from HTML?",
                IdealAnswer = "JSX is a syntax extension that allows writing HTML-like code in JavaScript. Differences: uses className instead of class, style accepts objects, events use camelCase, and it's compiled to React.createElement() calls.",
                Difficulty = Difficulty.C,
                DomainId = reactDomain.Id
            },

            // Difficulty B - React Questions
            new InterviewQuestion
            {
                Text = "Explain React's component lifecycle methods in class components.",
                IdealAnswer = "Mounting: constructor(), render(), componentDidMount(). Updating: shouldComponentUpdate(), render(), componentDidUpdate(). Unmounting: componentWillUnmount(). Error handling: componentDidCatch().",
                Difficulty = Difficulty.B,
                DomainId = reactDomain.Id
            },
            new InterviewQuestion
            {
                Text = "How would you optimize performance in a React application?",
                IdealAnswer = "Techniques include: React.memo for components, useMemo/useCallback for memoization, code splitting, lazy loading, virtualized lists, avoiding unnecessary re-renders, and using production builds.",
                Difficulty = Difficulty.B,
                DomainId = reactDomain.Id
            },

            // Difficulty A (Hardest) - React Questions
            new InterviewQuestion
            {
                Text = "Explain how React's reconciliation algorithm works (diffing algorithm).",
                IdealAnswer = "React uses a heuristic O(n) algorithm: 1) Elements of different types produce different trees, 2) Keys help identify which items changed, 3) Elements are compared recursively, and only changed parts are updated. The algorithm makes assumptions to optimize performance.",
                Difficulty = Difficulty.A,
                DomainId = reactDomain.Id
            },
            new InterviewQuestion
            {
                Text = "Implement a custom hook that combines useState and localStorage persistence.",
                IdealAnswer = "Example solution would involve creating a hook that initializes state from localStorage, and uses useEffect to update localStorage when state changes, handling serialization/deserialization.",
                Difficulty = Difficulty.A,
                DomainId = reactDomain.Id
            }
        };

        context.InterviewQuestions.AddRange(questions);
        context.SaveChanges();
    }
}
