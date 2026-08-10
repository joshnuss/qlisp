(dolist (x (list 1 2 3))
  (write x))

(define total 0)
(dolist (x (list 10 20 30))
  (set total (+ total x)))
(write total)
