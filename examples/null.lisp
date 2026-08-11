; null? is defined in src/stdlib.lisp
; t only for false and the empty list (this language's truthiness rule);
; never throws, no matter what type of value is passed in.
(print (null? nil))
(print (null? (list)))
(print (null? 0))
(print (null? ""))
