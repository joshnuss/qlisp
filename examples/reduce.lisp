; reduce is defined in src/stdlib.lisp, built on apply
(print (reduce (lambda (acc x) (+ acc x)) (list 1 2 3 4) 0))
(print (reduce (lambda (acc x) (* acc x)) (list 1 2 3 4) 1))
(print (reduce (lambda (acc x) (+ acc x)) (list) 100))
