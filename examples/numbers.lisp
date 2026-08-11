; abs, min, max, zero?, positive?, negative? are all defined in src/stdlib.lisp
(print (abs -5))
(print (abs 5))

; min and max are variadic, via &rest
(print (min 3 7))
(print (max 3 7))
(print (min 5 2 8 1 9))
(print (max 5 2 8 1 9))

(print (zero? 0))
(print (zero? 1))

(print (positive? 5))
(print (positive? -5))

(print (negative? -5))
(print (negative? 5))
