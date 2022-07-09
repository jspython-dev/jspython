

export enum OperatorPrecedence {
    Min = 0,
    Comma = 10,
    Yield = 20,
    Assignment = 30,
    Lambda = 40,
    ArrowFunction = 45,
    If = 50,
    BooleanOR = 60,
    BooleanAND = 70,
    BooleanNOT = 80,
    Comparisons = 90,
    BitwiseOR = 100,
    BitwiseXOR = 110,
    BitwiseAND = 120,
    BitwiseShift = 130,
    AddSubract = 140,
    MulDivMod = 150,
    UnarySign = 160,
    BitwiseNot = 170,
    Exponentiation = 180,
    Await = 190,
    FunctionCall = 195,
    DotOperator = 200,
    Subscription = 210,
    Slicing = 220,

    //FunctionCall = 230,  // f(args...)  o.g(args...) function call should come after then DotOperator
    Parentheses = 240,
    Max = 250
}
