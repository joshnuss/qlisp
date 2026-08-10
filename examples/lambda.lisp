; calling a lambda directly
(print ((lambda (x) (* x x)) 5))

; storing a lambda in a variable and calling it by name
(define add1 (lambda (x) (+ x 1)))
(print (add1 41))

; closures capture their defining scope
(define base 100)
(define add-base (lambda (x) (+ base x)))
(print (add-base 5))

; passing a lambda as a value to another function
(defun apply-twice (f x) (f (f x)))
(print (apply-twice (lambda (n) (* n 2)) 3))

; recursion via define
(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))
(print (fact 5))
