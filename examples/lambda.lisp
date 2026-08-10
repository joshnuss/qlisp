; calling a lambda directly
(write ((lambda (x) (* x x)) 5))

; storing a lambda in a variable and calling it by name
(define add1 (lambda (x) (+ x 1)))
(write (add1 41))

; closures capture their defining scope
(define base 100)
(define add-base (lambda (x) (+ base x)))
(write (add-base 5))

; passing a lambda as a value to another function
(defun apply-twice (f x) (f (f x)))
(write (apply-twice (lambda (n) (* n 2)) 3))

; recursion via define
(define fact (lambda (n) (if (<= n 1) 1 (* n (fact (- n 1))))))
(write (fact 5))
