import { useState, useEffect, useMemo, useRef } from "react";
import Papa from "papaparse";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import {
  LayoutGrid, Users, Building2, CalendarDays, DollarSign, Megaphone,
  RefreshCw, Plus, X, Search, Upload, Download, Trash2, ChevronLeft,
  ChevronRight, ChevronDown, Menu, Phone, Mail, Link2, Wind, ArrowUpRight, Check,
  Zap, Copy, Clock, TrendingUp, BarChart2, AlertCircle, Activity, Send, Info, BellRing, Milestone,
  LogOut, UserCircle, Shield, KeyRound, Receipt, ClipboardList, FileSignature, CalendarCheck, CheckCircle, Save,
} from "lucide-react";

/* ============================================================
   Simply Breathe OS — CRM
   Calm, breath-themed operating system for a breathwork practice.
   Data is seeded from the six source files and pre-wired:
     Sessions  -> Studio Partners
     Offers    -> Clients
     Follow-Ups-> Clients
   ============================================================ */

const C = {
  bg: "#ECF1F8", surface: "#FFFFFF", surfaceAlt: "#F4F7FC",
  ink: "#16213A", ink2: "#55627B", ink3: "#8A96AC",
  line: "#E0E7F1", lineSoft: "#ECF1F7",
  brand: "#2F6FD0", brandDeep: "#13245C", brandSoft: "#DBE8FB", brandMist: "#EDF3FE",
  gold: "#D9892B", goldSoft: "#F6EAD6",
};

const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAEHCAMAAAC3AuAFAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAACf1BMVEXX3uiUmKfU3epZZZFXXG+bn67P7vlblNuk1vJYXG6jstCu1O/X4euPst8cXs6RlqppcIsnUaZusLG1y+ADA2aXmqmus8o6RGCjzt0bc3N8gpmmqM5sbJUqcLd3hKB8uvcgh+YqNVtuc4kAFT4yOE8Cf/8RK4ldYXN4oNklKDI6Ql9TXXZMect9g5dYw/sWP7/o6LX//wBqaunnpto4O09/fwBqpGqdYbD/f3/Cvs3//38LN8AAVQAAqqo/v/9/AABmzMyAfomCfo6ZzJn/AAD/f///v78AAAAEFk3+/v4BCyxLqPFyxfkGEzc3luwGKo5XtPVouvUyiuf8/v4GI3UDG2eO1fsBBhowN1P3/P5FmuuIyvUIMpkHNqh/f34QWMoXJE60//8TZtUADUVQVnA5RGnz/P6pqaokK0uVma4NR7S9vr6x5Pome+Sp2fUwOmY8o/JFS2qqqv7l6Pcqd9g9PXvU2eu/v/9////v/f4ac9skKDd/f/8AAP/K6fdTWHCt2PFVVVWSl61/f7wZd+NrqOmYmJhxd45ESFccIjdVVara4/ev2PE6QVkxhNtmZmcFLKXN6fbW9PzP5/Y8PDy0uMqSmK4A//92eoxvdo3S2Ol70f3Q2OvY9vtVqv/X9PwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACVH3OVAAAAoHRSTlMSnVrp2mXd9Numn6Oe4/7Prv0FZQIgWs4PA50RCgPbBP3gaQSrAv5erve0C/Vi/QQHAQQFdQIFBQKQAv8DAwQCBXfDBQECBAD+B/7+/v7+/v7+/i3+/v39/E7++/7+Av7+A/798/tsA/3N/gT4/vX8/fYDMv4ENQQCjP78AgGt0s4DrAT9/AXP9P4DNK34/QX+j45xBG6QAZPvUv5scAOu0j1lbAAAUs5JREFUeNrtvYdDE9vWNzzpFal2xaOnt/vc+zxv/8r79Z2VMEgYCDMEYpAkRMEgRQWpggioqIjY0X/1W2vvmcmkAAn93Os+HkpIZvbs3169bIkdygCQZsRPCiiK9OzcuY3Z9Vkx1s+93jonKXwY7z93TpL6ANgxDIA+6dy5L5YXFGVra4tmGniOw+secg/RDwE+9y1JMab5I075wKcjHcYTjs6IB8u43d7cfC4XKzNyQzS87ka7XTOR+DLQd4SwIBQPRt8Zv2hu99fGxoB3fn6ocKYtOApmnpv3zjZqGp9nwyhOGE4uIBPwgD+h8no9MJQbMh+Ij0+fPrVYf/lED+r1Ii7zgcDryYyx9RrOwSGjggTcd07/WVG0yfVAIBcT+6ZgkqUjjiPmjeGkc7nn6xkwrncyARHzUia/zuP+x4fDueM/CyQtLdH8sLz6SdCMd/YroiIe7vIXAMJ25kCReAd9gw1fLhu8SbOvezkOBEK0ra0tut0oAYYm7R3KeQOCwEcPCpODAwT63tEzbn0lLFqs9N6y7WO20YhE6H8a+NyxeCwXWNcM6YKsXYIDoRciioYmgyomJ18HAvEoLmtU3LpNjIrQsLyCO2loyP2V0/bogcxTOkjiUCbdhEZcYBEvg0WbFQl9RArGXVwcfEPs+axgYeIZG/r2DgsMwqKFKDQUFDXxaFvkbmtr691IAR7lEbEgUYSL/juKldmgcjC862AAAWQsytbskCkO42XpwnzitrbtEcGBK9VK9FLjDbjdk4iL8ZhXUBurEBh823Rf30WT4wFKiueBmqWlbrx4e3s73aM7f8sdAMEnMTEopRX9DUgprzXaQXD8gKCywljmawEaO/Kotl3wMGG5ezcicMnNbmQ0zVSSL1++fGVm5sEDIps+k3bwZ/pvdHT0y+Lly/n5KZNa4PkviET7+J2HDx8+vqPDUTEipRIEEdBfNJ6KiDo35A7CfqWJdDC86qvbq4MR31FqVANIpJsvWrtBL/HcfKBxK5OpkEIyGmxtIHfyLHV7EIibOBCNx+1itBqQdBchUsBe6YWWslTB6aL4saLxoVnaNfsxT/YLCBKHkpkd0uVGGV1qRyx2oZCi0d4doYeuif8SCDyfnf36NahpmSB+ESYBMiX8z97YeOZMwP9LTY3nD8+dOzdv3rhx46YYRB6P79wpQqSERvjSIg3EuYaIehTZhwE+nge8XlSP4yQn6Sn1N1seBYVfRiEBfzyAILMCFORFcJQFpGo8SgEpHLSSS0vi4h6P548/PHyM4zh1CnE4derGqTwYJiCIyAsrIKZcj3AcOAw5ZD5ud2aMOxOgmCPga1pmY30dTZc4MQSdsIxHaYnNbylchh05IHRLxT0U//TJ0Km2xaNth7E3PL6j8ZgGrv4pDkHR0F8oBeS7AkA4R8QFjdd4592zdiQ3LpTyy/ml4Ut+FOkNWma2cV6gktfeIy25LdiryrUPQEil+DokTI54S8ve6GNbArm7Mx7txhh/yAdf8RvlRhGJ3Bkv5FmkNMQDgXV7MSmwvgmAUmUb+Kt9D/rOmQqcomyse+PRFvNhWiMt3tdHTiFA7p9c/FMRGuUQKWSzBoeI7Djutt6tBBAiEQHHjW2HBY+HD8dJiCBxtXNFwTvfaPoG2I8/TnzpE1obPty7SjTrwcEJ3doE5fW8V1iZ3QRJNO6ehC8SHBUgaHkAcqsix8j2iBAUgtdyx4OuG3MeTO/WN5YVkLuV0AhnWjuQRwEkOik9bG/vXorWBIIbprf5St9+nJqkexsOyniUDJ1u0hAjQ27y7h0NILiDJudjLeXIw4KHxQzkKHi9815v48YW6q4ZYtUKft/aQuW00Ts/7yV06M27ig8rIO1EILsgkudZKNA9iMX8rOHIbGq6cjD+ZYDRvi9cqgTiUTKhaIZR0rh+PApAHqD08Ma2IY9iBT36KR7PPZ99XaKwFD8Tqi/P1mefB+K4zQiYbt0I2Y1nCTx2IZHxF6iC+QNBu0EWDWRYHrATWTdEn9foNlSkxZ1hX+CwAYEHqFwheXyKbeekNgmkJZ7LubfMgMcMjgeCTdP/E9zSpvEj/sHKm5XMRuO814O8rFt3dbSXl+nt4+Pl8UCVF3WvUzdunhpHhbjG+3w9H3aZmTgk/z49EbnNYMO7JOjcE3/NqiKSPQCCXDGDylW8ZfvAAbdzKdixoRtt7Ap3dOzKivseXLlyxeL10DKfg2jlRaNLSwgNZ1Lf5cFoF5pvISCn+MBvBISnxv9cnwP9f7nhyhEEwCZIOc48j3JI2iPzSjUeLmkv4uP1UHlfm/kayoxYzq0z6plquTQIxdLCBZA1kxvEW4M0E10yvSqtulg3RIQOAqcIf+NGXn8yLntksUjk6SyzXiOoJDoLLAGHBQjeyB1r2RaQKP8/ngsIV+A+JSZ+uKHhct5TCEwJBu12+8as7s3w+3/hw08jEGikgLBWcMfLiw18Du+OOmD/ZQw5V1x4ruczh0YhSB8kPkqCA9aYQcy7JdA4gC0prjAxQTHXy9V88MrFcw9g+ljSJoyFaqBQtoAk/hWuvDsMQPo4Hi07CI/YkJvQOH9I/AEGuahpWLxsjH/TB/64ONrXBwDHh0LJZBGSQJS0xSU3VLbWUpWwo+mzAx5tsdxr4hgnZ02OeUyQN/x5lNSteY1dOWhAkD68nF9Ft0nJQDi+gVC0hxEFzYt8KxLfYhf7DhSQCcRje/qItgxtKDwn4RsKhcvWxMBOClfLxsFSCNpy7h1MwZhb21+s7J93IF3AbBQFyay2q5pROSDv3rEyeJgB56FJYAPf4NhuL6Mo8UbaI7hp4YAAgXcwG9/GSdISjeOdJr7BsaMogdfRF605YH0HAghILDMULWd1ECLuScb6vq36bnwrONTq8QJ7cCCAMC0XLU8gbS3uIEz8BfCwqhvHQM3wRZl0L0W8sOPNKwME3kna0HZ4xALKAc56ZuYdjcOB4+nTp2RLPn26n7yQ/XgdYMsT8So7cZMKAWGKW2Qilei6bbHXB2MIooV97lxDnsLPHZgCDdODl4ophO+hKw1HK/dIxQJvm1fbAZHKAOljk7FoS5kkPtR2Xx+Erjsx2GDCYs0s2L87bPTp9/qFtc+bfmOcCRqJkNNwlOwLRTEEIvHMpW2fqyJAYEDJRVvK5oHHvlYZESunE3KXAihbrwMBtzfHS3ncgY1JPba3H7wXxZUb315wOBzDw1c7rl+/3sOHw+Hx+DcUKCadw5ftEPDEtW2fqiJAzrGNeFsZ8iB+BftkxoJpKK8DuXhBsl0s5o3l3Bsa+WKmH+zlHjDAr+yqc6SHOzo7O0Ohzs4OQkQfvb236x01QU4hR0kkl9nXJW9muxRgqSLWp8TLZB3jr3H3PgmeLCbQAt54vMXISClwjsViufktNDkrD/AYF04sUn6vyzGSDBESxjAB6enp7X11veN6vcO/gWvz4AijV1+UTHRoOwtRqohAAi1tZdPAZzVpH8/BS6SUzHy8xchyLqPHUfDR+1qpUlPlMdvN5nQy1E9w5DHJUwjxLfFTveczHKUmjJt4I4q6FuwREPx8vK00MR9/9Cr7mxexqlyUlxzkc7ZKffqRtvjQOr67odIlg6coN1xzajgcsg7Cw8qzdFxeESQbJG6PChI02+/n3HAO9gRIXwJV3raSUgkU8t7MfnYVMCn4NR7tbjXyzvW0IZEimy8OEHTSwn2XlcVhUXYob1PZIjg4jXAMikFBSnlV7wkepShpYBu5dbZHQCATayspX4m2/C2Wgf1k+1HePIUJrLUAJfUzEV7gxtMmorF1pQIHDcA9Bv5UKCyHygxOI2WoBMWJww9HpwHDFVh3Pyt3u90B+ZE9L1NPFG37NLs/dqW4a9ot9TKRAjCMVHKjgoZuGGnJuZXdloz+bF/OInHIJiJyuGjIoUJIenoRkp96HBn4NzgqMSLBhlsps6Gl3XecFm8rB0iMl7Lt1UECmZynm0Z5QNoibSbnsqRBxhERabcHXVgjXiXzgd8IgS4rHF30WyhkoZNXrwQrqw8qR6kAT5Zj+dKuUIK7XMVdW2x97/5dvOjXuMCjFBGDV5mSxJq03TKk7CTbKSPfKXPZIZfQRckICUIhESKA6az3Axs9Kk/n3tReJJBcWzlEhvaeY9PXpMx2t1OSeDlITNkRsUp7U5/Ivd4+oxzxsK/owkO2kAMyKTmcR6jL+FNXOETk8SrPvH76BQ64VUGF3ueKAeljW/G2MlXCsa09Ewg0sYDnjqi43AGQ8njgTni9veyFBTUc6idGlV99PvI/dRXzro6ePCA9r3p/UdixBtqkXZnLUESvoGuzgjK0Z629b0bx33lMGboISOs2iOTxiLYVW42x8qId2BPwrYZlIgcBhyxAmPpVXXF+8PmcqZVff52SdUjEN3qrRcL39vZer4FjRWRXQLRYJFpSw00+rAd7lR+Kf/yhkc5ejkZMOCyVcFZA/lYeEfi7UiuHTcqgH+TVlZXl9y67aDaAXyT75nun+qtcIOe7LJAgID+9ZZfgxALSx+wtxW0n/oYqVg71pD3eUQmM38xX+ZXgobfWiFM5ciCXi+ebwlh61ZQigoutNVs4VbhLVlfqXFqZWSp2m1OV87yLfupAud4jeFfnT/6jEyPVAzITKAEk2tLWMltRFl65eIDi9twsKLu04NGGcFCiNjWfEa1D8Pu6Oxe3lutzp2OJUxN/Xw6b9NHVtZp6b9cdO08GEwnyTQJ+Szx5Q48Mim1lqkt/O4ems7dXB6Sjs95+jMllu7Es8FrL6XVc/hbfq41+8b997TbwKININOY1u2bNGEXIeC97IBZrsUYskWUWzBxeMh/xK2F1dE05XRyNRPlpPqKLupyrVmnSgdZ6j3CsdDqOUbBLuzH8eKQEkLaW+T0bIJonj4eOiAlIy9DXSd7n6BxVIulYgGg0pmwNxaKWNhdDhWHQBLOhda7v+Ckn+aW+T+zknKcvtpTJt5DXdb7q1QG53vNWRLZOIiBbLYU9Jzggn17DuT3iUXPq1Hh7ESIcku5obktDuhgs2dTvAB5M44cnh+IWQTJk3cUJOLOqC5AumVNHYno30l9kkLFNdZmAkE1iuB7rn7HpEwnIA9YYLQGkrS2m7MkIwX2fO3XzVDGF8C4Z3TFq27K9pkBKnYLSxKL8mmwzwcY0VTf8ulRbpbETYL+Da8WUO7Lu4eJfmk+oUP+RzbeVAcQLe8rWADbpuXGzkECoNo1qumMZ8iu/2+nTfSiLA3Gzw553i5kdD8EprIqwPGdnl55WMacxp05Z/Juh/nbUf4aJEwkIeCOlgLQE9qRjoUDy3jhlFSG65tva6nFn2CDsfgFK/sszrbzq7ZJ1PHzVbRR4w2DOoipzGukgTasGEnACATnPPGUopOUr7AWQPsh4EJD2QkC6Pfi/W2mqRG2DvnOgeWOmpjXTJywQRTCermwtsIvVTSrBtDmrv5HLEFS00soxSZGdndnvoKYMhcQn2V7M9CZWQ117igHpbu32aherUKPXDSLJgQiFwwL3mHTJNuXlQLWzGmDSmsVoJzRwdHYEjqk0TtrZTiettxiQSEzbi5oOMxkP4jFegEc7Maz5Kq4GfdPMqMrmmRvUZWCNJEDXlGtPK5BgH/OSHUmEE0hHyHFMlsgu4R6tpUy7tfie3G9XWODOqfEiEYIk0p6brKqOC9nl5JCeuUX2yiN4Tw7FruxpOA17Q8Q1lWdanEQQkPQx+Rh3XIpRpkXLNMDz7s0GgaXHd4Rb0SrT26NalZFHGIBgrqXlU5zbIjMM1rq4urvnNbjHfHm3fKhDB+TMUYWqqgJEiZZpSejdy9bpg43um4hIeyEi7d3zrKFqbIlGqFYebZFF4CqWbGMv97qjEwxWChHp7Awl3yJQJxqQyP4o5Cnzjz98PF4sQpBAqjcyoQ++8mpgSg1ic1zf3c8iPGW2Xy2A8Iy6ZN0JBeRuQaBiz4CgEVJz8/HDh+NFVnokAA17uNoMm0Xt9xPxLCmLgFyF/aWI6ZalHmoPhTo7On5j3590QAwq2QsgfWxyiVq6jXPCMPEgAtmLCi2dz3hbYp9izxjY0MRe3fyPR/tZhQG8ShEgpGZNnzRA+koA4WMvMqSPfe0mQAwgjMZX3r0QCN/UmRyqWQHGzobJQB/Y1yog/VqcWslOlCMESOIEAtJSBhDPHu7zgM223xwff1zUIi6ysddI1wPmHorFcnB/qqtLVfa/dnVmtFHu6CQKGTmZgMRLAbkb30P85goE7tx8WAxIe1TZa/IKgOb+1OJVkNfI19jLfS7DIGvM5nkWZWWTIXLiAHl3nrtOSgDZg6U+zfx3LCzLACSu7VkY9zFtqCWW8cnhFTQO97kMqPmOmDyLAEmeSEDYeeYtA0jUXnUSKfw7/HIHRXoRIK2xvWtHAIq7JRZ0dq1eY2/2vQ6PmO8vQCHs/Lv5Mrm30fWqGT+cV355/PjhnSKW1T2/r6mjeej+NXyWPWIHAIipZ8mCQlInEZA+tr5UJh16qPpgwY9IIY/v4L8iQKBp76oRKENx95T8JxLyvscAc62apiFVXPWfRC2LlMtoaykgcai2YTNF0xGPYkAijfvpyPGAbQx5w2v7KqvLCxFJ7bIYIqHwSbRDeNZJd1khUqU1Bz8qnELuPDxAQPpA8zZ3+Q7EKUuWSAEgIR+cPEudfAq5ciUc3qqp+X9n/nYOSPsBAsI0d73sOhDOYvWeCEDqDkBVOHhA3oE7UpoOjZYI/L/V2iHPywMyuK9FdJ9VDyxq4SsE5CR6e/kmjLaWJETfjb6utp3pFRbotgByVz/cZn5fXX0T/3DX/3AQOha/WiEgyT/Z0xMICPuR1XTnh9WdVZ1YH2XPuh+3tyMkgjT0xOr5fU1+kGmOa+z3w6CQ/uH7bOAkAnKFNUa6u4sx6Y67YaIqRCaY4qET0hAQ6zkh3n27za8dFIVQcrBhiIRk+epJjKmLZ15qLUKE/rmrdULNME87B6Tdes5UTNsXIADNlw7KWgCn4V7kpaJOdlIBUXJmpVN+tNYo76oLOc/AfHv7i+8QEIs0utuyzzxzeHZQPbWY4uwyAKGyqmvHYhZWUvSpTEbKABJ5XmUOwAP2uvsxAfLQamlG9+p+P+iBgKS68mm+YfXj8eQ47K4sUfPL9gIaEemf0cyEVOUTLz3+bvzOnXErz2qbh9F9LuSBAaLmo7hyeOS4Kg13bxzQB1+7LYDoTijuF6xqyqNoGhIgBTxrD16YwxkJJv1qFosgibyH6sxC0QePTqTBMTHaJ44ROgxAaL3i3Togopijlf+0VGU+1QNm7/6u/U57+7iVZ7W8hsGTAMgT5p+yVO9kz1Sh9JqntJWuXfUtCqVKsP+6REyru9B1/sI7WRWJvGsCrme1F5LIPDsR4yV7L3flZXqFHIsoYnTaoBBFs9sbabhn7XSwjKg4JXI5UEAYnAdva6vH01p4MFd793O4Ug0iX1hAHOZVQCLx4y0LN8Yb8FkqqmVbBdbNhFFCoiiv191DlHPh1c/Mjnl530j37LrEax2nK6cUqSJmsxV94Sk+97q1fak6BwowLfpQkEhBtOsknMAyQ8mL+UwgVdlNssEgbXukAvvsfE70ivxkdos0h3col5uftevnDR0YIO8GIdDdXowIMq24UtXpCtPgf0HOk3YLIG2R3EkgkafsmWopE/HBo50VHV40qrx2U+ZL0QkF8XisYHiRWp7zY27OTxwQICjflGgeEEuxprcqQxtVS+5gbG9vtSRDtmywc8cOSIK5VvNVIqv2Hah2gusyivYZmVTcQhh5QIohicWIgX1V6LOwOyCVGKSjMNtdlCTtIVCoFK0KRL6AX5ww/8KaCTnPTgCJwLKls4Nzh/Y2vEZI+4pomMtfhEcpkeiozFZSjipVuoP8nvbigYLd41aqCK8Dm1x6eIdGuyUztWULRo8bDku8EAnEtR2BTPOutuve3A4Ho8UFTLECUEjMxGO52YyyW9N5idl+roBIpNFMTQkaNCJfq9jfMEAOLQJEV7RERVZOeXfMJDLAXFNG+rvcNcfKNjsBmKFqeRIbOiXsgEpZIonHhnY9hkhiH3yVxColeL3U3lqCCKpa1bTFO8cm4w9fIB7j45b6hmhgTwnXBzgeQZ3Z6iysNpYzCrnkgNdDQ3FBBOXGp/I45Ae1hp7d+SRWib0fqWw9we0pw7Pax6NupeKqdUpue0EEcme83Vq0CGz0eDkW5DlW+EK5JCdqXhN05zgc8Xi8WHh8Kjom2+jLXUQh9JEYHQ610+kIf45crMRNACwzdKf9RXFF2gtUft2Vcy1KWh9/wTHptha+w5Xj5lhGH5quNUVKlOyjCQYZ4lXxWIsJRNzSdD0SMf181l460QKrBD/IYYzRCSLbn47wccRWUTh/gmk1xRQiMIkGoRpEPA91Y8TSq8N+zIrWcr4N47WyHmUN4WiJffpkpYs48aBoxPMCh6WVTndhOU0eFfOjn+Ib2+5hicHIb5XlVwCzR0uZFs9hX4d/r3BBoQ81aFGJ22rtngLHKNcHmF3dXuWFaaZkZodi8U+fPhHTiX8yDPKWaPeL8Zs3x8fz/b8KUw8sncZaTBLhJBX7qrFz5Xu/N4FTVSpybaIuWCxGDLcW2SMVKtB9TMmJurYXFqbV5j7Gg4Tv5cPpXVP2wtof/A1lxxDnVHEBiM6mIi9O3bxx8+YpxOOOpQ1CQS5IQRMlwtCgkb998m4j26XfmS37Fp5W1D7nxxL7sFWPj9Ap7hWKdqo2FE/wIj/hSMvWsTGtBAMzNiXbSnRGZTYX5/qTgQVyqmj3+A0cN0/hQI1xvLD9V3dRDWDUJBOrHhDbgpkysl1aZPbkXIUeEDqb2HOnlEJI28plWFOl7rOMwfosmlZOO66D9xJswXQr+pSEhUBg5h+wYVGsYp84p4qM37h9gwNy8yZH5E7hctwtrMqMRi0NEi2nS8Rmy4leCTfsiGyH6ZmKmNaVSSvXKgiPxDPU57sy1ve1m9s0VqYVHVJ+PBYamU7AisGw1qwZ79QPalIc/st3NockvjRef1vAYSBSSCHFeZ5WplWACB03WCZ1B5cQHOFlqJREmibnPWUBaW1tmYVKO4exeZ31WebbMntcPi2jMqRLdbEnVqeVMlvgIkHi8CAaJhx5QO6UrkdpM+JCI4U3Ti/jnJXQTH8vq3bpf1Ro2UnaUHc5OHBE5zOVAQszWk64jS1ipC0+eQyREerlu6b3zpTf52sVJ+jMwZjVkxuLR4k4SGxYERFCJG+ftXL7IxqPeqIe/Bfnym5UP3fDepoB735bGnuQ2CCcUUMXKp4/IiJopBAMkRs0FFRmKgnEoDUSH2/lmFgE+1DwWEhk2WBYzaZAB4kpk/NW8oi1dNff7kU8kEJu5yExAGmnbJruyNJSjff580YK3yoi7UGhGJZ99nkOpVC04GCBKJf2Q8VKhER+g1R4RKlmcwaWSgmkm2RZa9StVHIKHcB/y8Rf6DuKwFgyBPtRIzIAm3ogpMupGe168WvGHSuQwJ763t7b+jh1uwiQhw/bu5fi8UBgS1G2eQBF4QfRxVsKISlFRKJoWV0oaavU2Aboo3PfSgC5GxHKRQzN9ncVIALB6IvWPCI6jRx1w1zajXq7xhXIC3PlK21nE46l8dsEh4kI8a0b9UKGoGHoWVoKBOxGE+0vXxoGBwcf4CrwyPCDwQeDDX16B2Jly0uEEs03UY9EhrSLUAzIRbU/rQ1Wnjp5EYLxYkTMkGwsoFQALrxjk1E9+pgHJDp7tPFcGID3Bh4f8zpixh23qERL470IR29vnkQsbOuUx+OdzWj8Y4s75GJRA2KuyCqv3bEWazu4aGGXbonvEkc4+baKXFY6NyVexLXyQXJ+Ou6uaRZwDlFFGnlRgEjLV+XckdKIXdiEXWt2Js7LlUB5HefWA+1ihONUb0+vPix4IH3U3z71h8e7RUxq8crogwramAI8+JEyIwJoy5hHDUSiX62Hc5LD4w27kEQpUhUiTBmKtJfBQ9TzzFcQrKT6pxrBtfLmSIRcx0eVyggJSU/o7ZpyCZ87b8UVNc2Hlkh9jwlHEYkgcXi/8mecqSaaIyLy6wSJwbRiGxa/k8Sda/eH+0MLShWRVFJDNiyCpFDrvttWM0tOf5jZBdXJmJDs3Wbv00g0s/eDF6oXILWinemvol0jbnLldY0Qhjoc13sLhg5G7+1TnprPxJ+eVq+q91HinOLORY1ztiJxS0skAgRFj6O/fzgjTVeVQoKqaz6ZsaS5QM49ufsOhUzcYyKiczw6+eBonCiLzEW9tnj7zO+5UQvKvNGxrS0aGedwFJBIr4Djj5pGBf7O9mzJTvRRaD4ejbQZdUvTExZA2CV4mwyF6qpsQnwFlOdLwr9Y5E8jIrnrGdpSpB93W9pMTqcR8+Pdscmj8vxKahc/UqFWewnUXwgm4913jY0xfpsOZ+0tppDe3vo//Bs0v+n92LE8xuKNG9v3ObtsBWSUKSOh0PAsVF2jslEjeoXfvVuuBYc7SOelws6cL0eGv6fdQmO5IEiHjgi8kxQn16+SNmWMHwGoeaPdEf1Jxm/z0w11RCy4nPIESEA27NepACQgtmI6QUa/GsQmpMl5NEVCIYdSXVcdgKcMaXxbQCKe6PMM2znLQmLacw9Xfy1EllPYoSOC11/mHpPVGo0p5EjU4pHWu4LYX9w2jl0XkOiAXO89VfMZ4Wh6cDDNClBWzOpEMmSIEQFIA/uYDnVePVN1JTCS+RY+R2t3a7kDIvFf3J2B7ZVgYGSzuIXv13KJeIYdcgQRhE9RDmdtyiDt1ozbo1dsR7pRlvf0WAHhgqSnx1ETRDhGD04LlMif3Kb3jxH7VjI2uyPUgSRS9cYkBdgbjZTDg/fEpkNzlB0Px4YHMFtTTCMoRw7XQhwEv8odiuSioHMX4q3f8c6Dd7tP9ZQb13sdNfQgDyYOeF/AfAvvxaD3b5cMhePMcKgz1KxULU6J+SLfKs+zhIRvmQ9O7sCE3iGNxE1PqfhU99Ck0nd4vl8Uli6yCFG/Ut7gXbTX0fbvhBJPwqMsHH5+LNZB20gkRWe5tpWb5M+rAzJzHkmkM9RxZg/V8nCeQcYbjWwziCJb3OR0HN2OcZ1nk1y0W7hWd859qBRCTS/lrpVNOsrqP2fcRkTBFB7XrbBc76n/JaOwpkMJD+AlX8dwlVrcXNs3TMTzzHUV5fpZ2Kt0ek0qyjYkwu2SoMK2cwTjhlX0uFdBPxVJOhz6AKFghVN2IDaeib/4TgBS32PicV18pZNye5A62OFFz9B+mCRE4kCn/Er5WTr6EZELcHFPjcQZ95DuxLjiOV4kUV7lItG+JBIf8pL9sLRfvBn185PniGpR0YnefNxOHOtUb/7E++sGmVy/Xl+DDPfyIcbO8MrBHFqisxYZQlJkcxgBGd7c40X7zjHlddygkrvljkiPximLkp0v92x9o9okIfLCSiNb7HC8KLx8TW5W2GkyPl48/O4OwjFO3Kr44HuCA63Ai4es8gGapLgDNWnCchpggpNIP2pae1yFL5SMnItuRyOcd7XEAvxgvLKnTSk1PKUlz/niXw9D1zqt1Mkozt8rT4hd1Tx8/N3Dh9+1c1XXgoXBrYjTzlS6rPBukBdE9wn9qfK5TzAtdrftufLACghrREWrM7Ss7JVR8JPUJlGLK+FcbZYf4wGyTATrggLGLkHAM36n/UU+thKfVZh04PzqFuKxguruOcpquvnw4ePH4zcL4SBA6HcHWeUNsCsS04uLi4XNI1E3ukgmy47nnBXo/lvRu7Gg1Gd53KdQx/txvt27/KLbg+aOb6tyCUjmX5NG/2MZcWJfGrdWvEWi7szBFrwlLvHWyyt27kyqOXXjISJy8/b1YjwEt0JNd0c4ACxhPYqgg5axZzIZTcvQqbG82PPfHwxWspwN5EdZZ+ckK6j3UYp0hoaD+xBgtMigvJ5vadsJkpa4l5emFkbyqSImw9lWa/6o4lyGDcBB0odtNbzq41rTR89NHoS9fb14IByd9Z6PO2IxDU/0uhpQzm36bXXNHxyOeoc5PHX+QOOYOI93cfdHQM3vdTQHBSfKAtxCPDpRjOyrHyevbNGe70AmdO5FNBbQmEI+U+sMFhkElu5Y1N+7aCLuzjQqpg8GF+QuFdnVv0kZ9x8cjhs95fDoaQ7s4F8A3Q0L8NF1a9nhGB7mp8DkBx0X2tNzu97RXOP/qBEql/t2D9h5Y4WF5n1Mc/QjIqHl/XVIfccjXbCei7eV6lt546QtFvhMrOuKdark5Ksp6PbQnZtkX+Cg6MMnd6U2tSaKVtYTHjd6r5figcLDj4Jum2AyDDzlWIz53zvS6audokUjgWAZusb26lXv7VN/1Pg5P9iluhBmIJ4rPHN5kbnoZIBQ8u1+tRvo+5GXR+aibdvSSORuWzTu5scRW7yn5MjwegqaBsXXq9JYtp3TIIM6WV7W2DOmffXwnJFSbsURcWxsl4QpoqqgbN5yprOhfo5EZ6f+rbOjMw+IIDXyTL66Xl//h5+k1uUdbf0+FhhyFx6C/RQ+hJKIiGrfv74pivKUdW85TIQSTOTTklsne3HAnCl5d4KefKVupI2L9r4DIBKkD9WmoP2fyY3fRjjqe8ri4fCD0E9K0TjPj2XwfyAw+kPWkWdWFkCumxGuVxRIAbajwU8Ff4WAoN1qT/MWkCMHkdYJYjtlZr3xlra72yrC0fhzzeqaoORId80f4xbR3pZT9uu6oEwZp+wcY5fQgq25cbv+5o2y5NFRX7NN1jhwTtW44BxJhovQyAPSUUgixLMMSF6d+sOvgLTDc/Sx9SJAUOpd6OCIoGB/dxBce/QKp5ONQDzatoPWlfuqmJYUAjImKe4ljxkYvnvXE5uU9ofII7CnUJrT82oeSj283VNeejQqUplqGSEW7W9TqIiWgFEOEeOShRFgB6F9eXv7sFDLEvvIIe5Xp1w8ICu5jx9qpGw93wmTlpg7aDVuL2sbNR7K7P+Ok9bd1lxwX1z0IlxKOe34w39oAQ/lVPWWI4+f0PQo9+lRIg7ljCMd2n4U8qy8wtabJxIkkx5ua+4YQi1GxD7MEUkuwL0D658nWp0p9tlYFEEp74Fcis0HNW5e6T1BgnGK4Rl6Wnc8uPc8U2BjNqeNMs+USS+lHJbhVrSGjlmNXSm+iyCOxlrHcKiiYai9Os8qypMgbwwSCWwfHykal9j7pNHa+SB7bcPgj5x52Z/H0UIp7xZumddM5R8uSjxM8aKb3ov/PHH33mnkHbOd1qRzTAt6em+X41a4gj/V/4K29YNi/xTBofkdw/xQke2GLFt6CVELNL6CBMur4syV69frPdr2RFICCNKFU9wkfeaAO6UKvQu1lNlcTVlLvjXSMrSFxCFKqSYQkShlmiJ8OCKt0cC+0m4kCpyf6j1VX5ZbcelR/qMfbzk6DO22FAlZ9KArP0J0QnshIK9eCT2uoUJAeO4177YdHvmIlskBu/ZGJaHHa43z8bKgoGmSYYbbHTI1HkSkWxBUa2Re27OvMTHI2GTuxqkbZeHoIMcVFOvW8FRSFHtzfacOR2c5PPQhUrbLDTnU0dP7v1gohIRVjbZNSWaZ57vHbOJu4RH7IXQTBtDTkpXXAS9vgnC3SBuOU/LQFzqZm/2HMr/k8Xi6OZG0trbmJvfaFmUaxcfS7Rs3eiwS1xydHY5gMRuBgfPkfuS8qmMb+rAgUgyDebgufUc6MXNXuKh/9crRCGXd+mUAQaZVpyOS0tih9AyFib6GGQ6OfX2+RPlqjcSeK+QNxvddBrvH047q1l1xoEJc2VuP/FGmzP+B0uO6rgIV6EKdnDwKDC/e2V7xOzq42mRCsj2NhHcZiAnC8EoAQvp1vR8mEpUBApKS7qdb9VNO/OHFyfRunYoW8MajRV4vpBJgX/poFynubk+3mWYf13bzCZXT7xdxr9ffRmHeUehxEpg4PkMJPSFb9Tuu60qsAIWrUOUR2Q0O/g7E5FWBg0Yps92l8katXe0P8Tyyq2PSwCFGk1GJ4ZSifEVrPmoN/rbFAxoP9/ZJmfmldo9HB+S7eIZdqdKLQHn2HoSjo9z46aeFQvLASTUxZcyG1GGSku7MDZXlXDoiO8kS2SSTV5ZAsSMjNUEFgNCkXDwLGYfz8LNs+64IQlnPUarr3VbdOkdIDI/KxyVLmWl8supmToDG4O3rnSVg0HrXBwsciQIZpKfrP+n6sAWQ7VQtkwjCXSQ8SH5wEdJVoIHRy6GOV6/ysTBHqUiUtnP81OrqnHz2UGnEwGSCE4oWdHujRhwFkYl/RcOkT2qiRkTjOiKR1vhrNvb/Vd7GbhS0+PiN2x2leHRc7/ypWVN+LyQ40LRf6q935i0Ug22Vw0O4NcQhMMkOdSR19azT6Ty7srayok7JchdhEjYw4YK+83qvybg6HfZiRVbaNn7l08HtcmpUTn/4hKL3zFK23PGWiPBjtUaHKF+OHMDe7oei3w69+lWRKjTbKU3U/kc9Z1e6W6PTsum5I8P69iZJsdc4TCCsJCKoJC9IuJXR0dNTj+MFqoI1Xrdb00zHrdboctl8vpSalcNhU+UivmWxRgmRc7sDggQyxjT9cNiuLtS1nhxJwQYY3sUMSXnRMyQ6lOHpY8rskk4jKOCjblZZUQ+lHtfU93Rwb0ZnQRCpsyPU4dC0782QJT71j4xlaizUwR0qHYViRPePdFzt6bl9+wbV4NbU+Dc0UZZefHvcNtLmNeeKKutqMMkBEiUG8XU6ipwD2wAiSaAEzSZSSCOHXx9QwMRBcc/XtOgKFyXQSwy2EBGzYAtppJJyeDQtPWh6hPKxVROUzs60TZEK8wwg6HeU+FTycOD/AoweKvp8jJqGJxDQNAuR9Y0adx6AgQGzGzM0vp/7VTYkCv7rMC/d6cicnt6dZXGmFZwy+kKmPoN0dMWxhi/y9bwel6+h3JMvbHKo+7tWo2daBeW6MPNMee653dMZ6uwsDHhzAnGsW6U5jF5kSqC5vrxbJU8hCMaNGzcftkfi/kDGaBMwfa5veqIchQCbSCwKa2PMNpeVDXHSzxU4cdlbcBl2lyH0J1S1hEiSu1ZcR9sZhrdkRfE6G6cSrXbq8cDOSVqg21C2XkTdu+8R0GpO9dCu7izCBNe2fgHgUj4sOH2ZaUFH/XXDt1HieuQUgmBQBznP0vy6fvbBl9FKInlAxALKxQsruKJcRUa29ZNgh50/+SmFa1cKwQuchrdTYaFbU13kUTdZEL7IzBAVBBmOxQD3Nhra77sdnQH/Vfm6dNtUjQqJhISpdVymsFX99VciBF6WPohNIRrdHv85PXvpXDUFEzBNjYYUW0pAQuqWrjJ01l+06PG7nPT556qoG+7qmrIpR96I5B0vIJ5010RetEdimnRRgg2PTiPIyDTYPocOnrLM/Pj1jry/wzDs6FtHs2Z15Z8/jaLfQX6Nnp7yYfbrt28+fvzwhSf+XO+gMdG3hyD/APU84ZBwdUtX4q7/ZD0HWdoxCs2YjeQIN3VW6xg7+sNweDiCirq7PdHXGenfWJA3vqFi2e5cRurbrlSOpHl9kfNJUEpHZ3/ab4nawWgTaAFH7ysKHpV1BBOjOoUi3LvOe8tcadh7vsEAu6jAW1WoXCFdtHd21OVDT7sdTswR0TU2n3Ic5/UCfEFhkAnURKLzgPa84iH1lwetaraJWPWx0xl3c6cZ+7aigsruB7vFVULYfXb0XO8h4WFUhBTE2etv3kQ0ajaUXZJGKvXi4AarnSK+JRMiHT/hFhnOF0pJu37eltegV+zH0/SN33PSHY14vmpUSP2iXdT9dufKHm8JFKit7y8fXg0hecCYgQcVpyu/6KoV98TqWdc6Kj2ULfSCaINL/gNJxZluGFRcThTrITnUeV1Ymw54NF0RILQW/+eq0bOTK1vHMaAPmiiLe4m6n97PxPXGhnfpwNHiCDgMfK+sO7YNtjo+KgVOXSVI3Cpfg3C9x6yh4sTx0BMPEm00XZk4yL0IC1lSl0K6Q6bDX1invtNoYq68e2zVBvDkeDojkkc8k/PUTCIBBCIckbutS7OlWQEMatLlM3VC/bxdhcHoUPCjklD/qtfkVpbUdy45Hr/wBLjdd8CFQzD4RrGf5d5bXQt3aDrTqigiap4+I3fJTu24elUC/G8o3r081+F5hDrY3b1bcpjuwADYlzu3gyPt1UzXEWnVkzUcjl5DbPToqVQCjW5PgFctfDmUcjYAp/CjCEO1Fp5WCgi8BL/ZabiLWncez8HWxPGlMc3tpeb/82gv8tyVIe18n2WqTHmrhrfhVsk6LX/8DFEK+Ukob+oV17B6zELP3lMoxiNxnrz34yEVF9L9bdyo6ORu5/rPwjyUKvos2FfyPn2ySN4cX6d2UILrioSItHPBrlcT84Hm8Mc50l7KDtVmuch5BvcdP4mQh97PxJDlRB3tUWFwjB7icyLr5d2IQjxw2VnHi3ArY1nko/vBiL+Eu+SUxI7pLGWh5ihUR+3Vm0JFjbg/33MquXpC5SBx2OGSEdgZJfKo/8mQGTw5R69I70U4PHGuVV055F1HyYApImdhr6/zJkiVZdVAApQ5OX9KE5W8JI6LQnixDLDJXDsFR8wm5chGPzr1OGep+MjeyitXsMgUMj2sUpy3mCE4br5Y8rozhyU4ih7lHsymwyGhaoWauXVYaZpTA2i+rvzpvauUJ5s4Nq5FfvUxraZVJA554f+AgXugLKjErcKliMhy2q81WEr9lJoir66RDH2jfem5pvz9qPQW5FpBEnmkavWnuKIlVfzRQWZTzdNieZdCdu8YT2FBdVer0cOKbpIe9jmytUJccylEJCwvW2yPK3+HTcdP14tLoHsFr/rK33lkB1jjArpoG5FXp8MPT1h1Z6duql1miLhr1fns2NQtXUFcXxKIxBWmXKCdZqZ9WIikv199q7BF3fToQ1Kv+amzsOCWZMftG3eWvJMab012hPsMzoNNFoCEHORFruboVFS2nCjU9RgLqVtwjOoWoJr4fEkI9qFAKhQOWTPWTETCoQ8aSAmzZbXir+/stOYu9vCEwlM3l6jfMDvyg35wVZd1plVvZ0+ro5ABUHxyVz6FQp5DSXIP/nFckDzQcrxgIdJyNmwmERZmoIfVa0q+NIuBtsyTHAoIpPf27fGleUpP6DuG7SVJ2gfOtDo7LsBg9bnLLotF0tWVrVOOkWn1MS3+opUapTXj6vcbSZ2y4KqISJhvmbxrV/M7OgvqaTiF3BiPPlfgUPvL7Lyx7FmuavEGctUCcgnZlq7/dnEX8orr+E7fplOxoqj7tkXiH8IhI3UwTyTh7ALARX1+DQw+InlcL6yS7ek9dcfD2xA+OLan+J65kuRBCQ3b2egesvvh56kuS8qq7HSxY5Hu3BTSakTNmzepZ1rm09LogBbFqMKAS2gKpktKAHtuI3Ugs7o4epwK40uYC5Nc73jLLknVLwNjjStd5kGl1BfaZz8GSHi2kN8ZqudtgmMfBCDhfH6t7Awyi0ExtmzNXdTxOLUUCFJSNzvWMcDs6TDXs6BJqrokH6YHUbabZ/kK99bRQ4IKovKxjsr+OCJtNbK+Pwwxol5DEgKDPBSUHpa6fg5Ib/0S2eTHf3g4gLbAVRAH7LUgCTZXZCOxkecWq0cKCaAJBcqFYREE7OZd/FNh3SYUiKTyroTE90woVwVVyz2nPG4N7jXACTjMnT3RuFMrTWdm3K9+QkDBogtqYaWQ6qPuOY+O7CFcaZG2gPo7P+ii2cj5R+UqrL5XDG8bLDLmTxuhOT1RDj/kmVXYiRlPwUUdNIZdSCF+2x5p1j4nd5lwyFyWkHg/fFMxcRqUM6IOU6T3eP6GkNToJItfsrg3LH0GlLoOa14WwXFbwHECqMPcYCnKxbBR40/bsh212T3IVHhrCndTlvx5+DNfBG197qqeAMe/XaXeKfG0UPrQXD1tdezCmXS+rl94Vn/yUJj83MlBg9zpfiq6diLLesreOl3ALkoVthY0B7Fx369dXdaClC6ZrgXs0iF5golZMskxHLLA0dnZX48k0uIIC2FuA6NFML1bcVztNxLlBE0NU73lCRDlRYqWglIkPCco26X+oIE0WHVT6/NMsfumLJo/b979q69RsMVDkOVkbb8dNjOtjG2fjAhAcB5XzxToFpupgnyHzv4O3tbyWJwkO45HUBsK9aeo4WUCqXpt6i2wN4m9LJDLN5UvRtF9XE7XGDt4pYt3D1xwJEP5OiZ90/fXt7Rxqa7WgqlczTwB7YK1HQa5uB0uvMziSUODHP5SMItq1n1d7VWcsu8jOQqrneojDslqV5cJiJDxUz4Xv1TiwJ6dxAG4HKHSNlWUvxD5W4sHTcHPmmTY5osDEBgJ5cHjcJzB6YydPDi40xccoZB6WjRWSDDt/8qqvj3NlBbA5ZSt4p2Ty9Saz8UVy4MJYzXhNM+cTfaXNHoRQY/6v0U9adR1jag5UolyobA3CVIHsKoP5DjCYQuFsn6dQgaZYpsKq2+RQqqv8HxKVoFzqhARbjOvOQUmb/YpUBL3UHb86Uz2b5uQeLXtby0BazI4nLlqTertT/I+cQ1w0qS5OQZBGu7P2iyW+pmraN/6YS+x8gZk7mecqlzaXkJW567p7VYb9sa+AKaJOlyO5LbtkCju4SFARL0gZUEoy1ct7Ko/mXIBXEoAO8kDnKHkQh6Qe/gCKfG0pwf2cK4LWorv1+SuIkAIk6nU+9O6Vfzy0e6LUq67ni2V3Kk/Fe7/+N9avOZWAr9qkTX9WS47Tvq4R0fgLhQ0UqaAe1fWSXphtTwGgBdt2ZxTVhXYdNNn1+ZQopjXfJPgHaFnzPA1/zbYkCju0AVPvgctszCyA7MivpR6q7lbEBAaD06Dfdn6fgFHAk46JueZLRlakAq35n2KPmWd9ARNVT/CAOFysU6dKhLwwkkvT/2a8tlc94s9SG9wFLyQ14I4PvbadKh/pw5u/cnmDAxosb/NE4X8zmBBtbx/uI5E+b2/AIU0sNPDhYDwzs+uFTkcUudce3qChHD7OdXVrq4SGc/Zl6yO/Fb3/meXXT9v3KAQGna76+e6OWeteHV6gF/Lp+7cUK9fHqG5vmPzCAg9gP2siV8/WuVnGDu4ztiHOkaZNiLbSrqSMqU2LYfl5Mh7qmq5NFEt5+KYKK7llalfu7rC5frkkIt8Sv1VXUk5nR8+/PCDz/eD44MztTKlZlV1xcmnBA102IDyZyob3pE6QuHhWxrxIwnWP83/j3Og1Q3nk92Ha3lM4C8Bh5DqJYAwEgUfnVlaN9XXmAF2b6Bq+50b6GC3za1MyYXORyN+JMS9mR4i87+tZufekyMMEgPEw5RNXNtweGc4kh8+A5d3wJTYc0WzjeT/NGyz45YaZX8ZOJg2J/tLA1QU63Cd5YsmX7WRC6TpUbV7LCF4l+J6T10ldG2rq8toYSQLv71sNNCRV1XVWWcR+tT6IJWVw7twqxDX0sWSv5O8Wx/nQv3cdO9HPfetwv4ypGE89fLUGWkb4WwTuSWyWic0xj3QyRsBit3WjOxoVf61qyDqKzTi1eyU6nQuuD4KMF42vKTc9jMXUupuxIGyfIRSrvhpREgJp5m71hQeww6/xhj7yyFSq96XthPOmm1NhESzI6ZbqlpVOKEfOwPKaddb37LTmVLVkZGVFWpdhDLEueyz+U8rBmGcXhQW9i1EQ2/lLe9IHWZ/cu51dKUEHv2hdB11iHsEfzU8msCXUnZorTF2YY2YBpLJasrGa7tQoFQfyFp8xCyaFGh2HJpS1Dxn8MlLrgycqRvJhnejDcoPTS8opMxOi8lKWuNvPOwRDmdHFsYOx/l/BJbhf0ptnyhHD2S3jRh5TlMrdXpG3Pk9gAKJxMtyJe73Xg4mUEN6Qz4o0Fx1I8MhUXAj7whHOM0TJqdNV5pWmyUDsR+NQNdhFz4d3kgwX+1OWSekLGkLqoCEtCDVadPDnomne7B7OUnAIB+GnQ6JN8QfEQzb3EhSSHGRu15U5BEO542LNGmzTQOmU17zj4iObiO3yG3W9JdEgy+4y7ZzKinnzbbUat4FgozfZdcfuGlxdO9cGvVRXU1QMps/z61keUqVWHpDFytsM9mvS4iROpqAUK3JvQtnSHiQDciDx4N/VTj0Ie3qDUGNa25KKKmcUJJqyvc2r6K+TLDqe4S+NH4cc/mcalbPbzNypM1R1PcTsUqO2PjhQfmLPVtW8S/Z4dqPB9H54viJZNdODshT0C5pXpONvEAREEQV6b2urIo1OJ8Y3HFBOLvKOw8B7K73jrNrsmyai/nKDiNH14IIb3efHFnQQM+1BJb4HdjHC2l8eVjo5gPwV8eDVVanLvy4KYNMzOTyKTTnfDbDhjDk9PmXLy89eYLCmsbgkycNL1++vGf14iqnbReQLgRhlGk5bAEkj0g/skvHW+RI1sC/vW4YJYrjLfdXjv71wagQEINznalbmTJ6AusNSwmirJpK+WptP6NsoZMVdxLpdtfPNp9zZSpPDNu3gi4sgwon1+o+WmJnIKHFWZcNh1I2zqoS/xxoVAwIg4kmw2docXqYHZuFv3BKTX1Y9vkuvLXZgvbTfAT9NhzvfT7fh9QavkPWs1NK23PLRT/pRMK7FIfSH7joeJqvhVLsPjU7coGzqkcJ9s8zKk+2Fj5DwmTVCoWxtGaBgiyvrk5NTfH/6cuUeEuX6VAsKKrZpk+6pcW9nBVm6fcW+2eQuZyobf0zsarqATF8hoCYpFQ5v/479KAvDYrsPkRZgawrwGrqlqCC6UJF7bRw5yz+c6FRLSBMDxsxxX7Bqa7udIjJ7gcG7ICIThtJtES50fOoLBU0sX/GUX19CAjfuqLZ6lIEyh6IYJeTHQSjGkHtSTiay6GRGEywb4DkQRnk2xPVJltKndKT5OQDwEL/ps7ZhOl5fgDYv9bYx/Hxi7prnTRZdUo+ALLgQmPNYfML0khM/KuhsT9AGJsZfaproR9dC07Ua/chOShsOOJctjUiGIrE3iQG2L/kkPZ7AYBF3QxXxvxILGiCi0h6lyUxS7Y2ITGrls0oe1ZFLHy2M4pi8Xexb4DsA5S8iAX47LLVOp3OFPKxqVUzgt5l5jXoDhi0UcjIn1u2XeNGvvj4o0EABv+6eBwMICatWDIPQRk77fILK935wUkI0XA6PzQ78aX3aM1vnr6fpwn2ZnHgXxmIQwDEcFkNLr4p58jKjxIVdnEw8Q2LQwLE4mkZGPiviUTiXnGmKOPZo/cSiYZEw8DANxyOCpDtCeQbMRw7IN/GN0C+AfJtfAPkGyDfxjdAvgHybXwD5Nv4Bsg3QL6Nb4B8A+Tb+AbIN0C+jW+AfAPk2/gGyLfxDZBvgHwb1QMCowMDAwdQcAFVvXxyBxwjIACWDpJNJijnLe9NWL6Wm25RPvpA0Z+bEvlPJEo/VnA1o1YKzCaij3Zbq8Tg9hXRTYnBgm1W9siA8+U/W+HxAk1FFafGUz3KV01U1MOnkEIU5b6kJ68l9rPLpfJvO/SWoAPGYWzlMluqr0OU4OjJSQcEBkGx35pLpdLqcCrlsAXF2sGoq7b2Fo3aW7W1m/jSALOLF27dshUuu/UvwBKJmXM2/fdacY23Lr0nDO4el/FW/JtLAAV+8Tu/gI0nC8G09Fa8ULvQUEBVAObV+TVqb9mubdoNwAFst8xR29x867344yPjw+btLW9buGArQdCGz+0yn3KRbdbypSgzam0wI9lq83M6zbvnMuntBZt4/tratxJCLKZdfI0FabqYQjY/qHoaNLVMEG0RBtj9Edk8jy7k5F38bUnRG0bOLoCFK0ETOETVbLhrRBlMvGR1eidKo7w5mVVTVLsJMKCkLEc61/IiKTizpr9GZ4yneLOriyzIW7fTFebAyjsWmV+Vzavzn1azI+IgAPx3P21pREd/T6rpFG6Te2LnKKmiz/LmKslkMbltUHvBkft55rss3i6b38wLhJ2KFBwOG3fsD/mowuspuzZsvBQO08HnkApbuyHQh5P445pk7DfR2foRLGR5xQ3OPJnkZeHJZgVGGbz3jeiV+06fC/dMAjZ9esvWcApm8iTSB5/1g8yzDpsyCAOwWecwippFfx+6/ogf2OiAsuBL6Wecz9Vt8p5pMPZ+Tr9AWPVd4BeeZs8uOIfpg6rPX8CFEuzce1/WuDo/M09091Ko7WJ+2tY3JB2bHJEZBheMTo5G5yH+lqtFwoPa4+O4kO+Gvcybe+TPdhUZ/fpiwP26ubS4XNJX56KW39NMeu8b5v2cw1mf7T4+5sKHkfyqGNtSVgsBGaAGpdT1Zc5mc7neO1Rcf4RcnLulcYzDtfm06EyzvpguCxs5z5rF1ZN+TecbMOkQzfauOp1zZ9NJvi7qAu1i0CbFVlnO5FdACw6LnbNg6VyqNffj02bKnIYDC+J+K1evnj2b1o9R/6D3kYONNKeR9Fmn07mmitXDLapvdoWf1hFKppzOs/QO51qyGBAkJL50/SOK2cpjGSc3fPbsWbyj2JQjTvq0ygGhyc6KPWWzTFdx87fKNZoCdMiukjFmxofTmU7KsgpWQJ4yF51sKKvBjChdsl9A6J38ue5dyvDzUJI2OC8ajC1+Ly2I2cjOvGYBbEzsjv60XXR5oxdrOCBzGTonUHGJiaguLh8yH/jbF5QmQ4y9fAmBpCB/7Xdd5Rt80qgixXyES8VwTPx+KcjX2ZnhXbiCOjkucNb25A04+vnu4JcO1iY511A5Z2fw5LSdP1XWrojdwzL+4f5CQO6xP/XmzTZT01ruD9VO8m3qpgZEcjbIG9dlFjggg4tMHCWV3FTu6Q8wnZCC/LmTn8eENsbgLN91bh000BrV/rSVQnBV+eIkeaVxw+Ib9oTVyfJ73iIG/zgiAGHGmjSxCwahNZrd1p+CjlL/8BnQD396xN7Sa/JZHR8xs/40KUED4OCnpS7kRQOw00qduEiz8VIDOPHXa+XUkUF2hgPyg950UxPk6DBaLV4lPpsUghqUWsHHHcCbNz1gnwUgL82rKc3hbAH9NYHOVcMpxSjn+hAeUSRchzcsKAD573w3SYoznNL+A/eZwp8qeynP5UCyD9NjqxfN6tWrnBvVGOI7oTWH01YKmWDKGl1GZcahTE+ZPZsNIi4cED6v5FtzkzZBHfV0o1GnFxrytyFrIa6RNfnCebjGAfmBVzDD7+w9F0/ZTX5zvoNDC6ygmTXfPZweuZJ6j04MCDmUxOj2gPzGPzfD/u5K0pIjg5nWH5t4Pd/dM4yfXyOHZH0nEiD9tKCndb2ETrX5cMGqNaJKZXQMTr4Vq5VgC8N1/C0POCnI4ex/54vE2IWsE6ikQhN0+WfefnrA7LybF94qYXnG8KrLePIB5nLUminoEt2nkZ8MryqSXqaBf/XpbxErzSnkpUkhPlTD+FYelvTFP0/0nUxRbVTyd2PTn2c6IPC9uPF9lZ93zmmPTsvAdxcAAoOJzSw/w3bN/kRo0moYlxgSZSmkkTPs3/jVUW9vHO5HCNIcEODqjAEIHauMEg6fMXvGBIS6F2ZPGxtzQEIjjE1b9Gr4IPenHQQjkojo9oKUpnGeQD2POSD8CHR680febVgAIictFGIAopq3YhyQ5M/6k8MAWA00ifYCPjYuDsro0oMRTEAuGIDQK3K4ltMminre9hBnhHQ0d4sKm0Nv2ZsCQEI/sO/1q6kchJ+5UewQ8ruAQuCJYhOdHObopEJELRwWYqA8hcicQpqEEbfJ9TGhMCPz+GAFhEEtARJWg6hL02c5IP06IHzvTf99sECvpr2wbOdUl7WZmq+kK3lAS0aXe2IxeU1AXPktpAMiWwHhyu418eRcTBQahtOcZeF91zYZ+zuqexctkIGuOecBQQ43gg9q4+x1ROMaCFp62f7k2wXexmRB0W3i8+xnKyC4SJxx5ymEZEghy8K5OHkdKApnfJcN17AZyrscCBBBIfcApuGiwmck10GTuJeTbzJdICcQEM5PL/Jl0QEhPjLA0RgLjhVe/Q2rQ/j8JBNk2h6FxrhgWaE8IPpJsAgIl4xBxayJkUAAkrUCQlbPz1wG4Pp+LDCwhVCf46fDh9GCyIDVB1EOkAQ7nUWCo8XlO/Aef5MzLK9pC/wqDk2/wSP2J+/cqgNyTufKSIlE0HOhMjKEWqpxgRZKfwZA/hUeyUj/YDsAghJK14+JksPp+wZ34UIDyespMx8RNxBwtoSADBOXzv7OP/o71K3YwHp04AD7OMxtC1eScFTPFPKOwVJAWB4QOes6ben7YRfcrZBlCXUD1wVq1Q9WN5jExDkJvDdVfyiZHlm2fVasLj9dqJuADLAzU2GUc3Xc+lyhiw1AEOm7WXMJkaHobSjvsWucRf0A9xJ0WCqrE0st5NQcx7kYENzLb4W25gSy57PB7RpUG4D8xjfimA1xDIfW/CazuCrU3sF/7xt8wpT1LN9zdXBefNbOrephTWzjTDpcV3CfRVJc8CENy9pR4CcwAAmVAwRZY/Yis5SNZXCnlAISCgoZnRkOO6HIlzWdIF4tmy0o1dT7Z+bBpSWAPGG2LBIzfEyTaZ8k9ppgy+GwamdnhoXNqn+Wsyxchd80cSl/lnYlZ57U5zws9sm9IpklCWaG3AzZfsimbee007WscDKVcqZS6ip15PDZ8/tc7ENdANlp/ZDn69yBUwj9+YPzw4cPTgdSe52VMwI3h7kuKrYHGldQOSDynPM3H164+QO/egc9zWoeECd/vJSz2efzOfBhSwDBd0pzsumH4R3DbilCoy0F5CW7kERTjba4zKUvCcC1MOHMNe4SQMLOyfu4UTaX+eG58jLwg4no43IpIGL1eE/kJFqwzu3bKBpqr+hOQApWspbaQAwU7MMa+0d74zVHlqsgqJE/YgYg/Xn/Be1FH8vXpsJ/IS8AzW3moiKskWVYrBQQ/RBxcgr29xu+mRJAQnSkCr0tFDpb6u0dYFCnhgqagaZ1BcQAxFR77zFfMpyWJMlPm5Ie8iXqlOFkI9Cp4MRYBwoAQZV7RVWHhzn1hFfrNN2xSYD0l8gQCoGAX+wL3NH3red8FY4GAxAU3ThCYdElEwzdVQCiptU1NSmcmyNnQO87rNshun+Pe+988MaqWqbD/ekxpNZLjJ/1Fs7axyzOtAc7A6K3i+TTMrxVU8WAiLVOcsOzSIYIiXH/Pe/ybfi7wmv3eYvjYrUXX1gO9TsUkDSuX+OOB22kX/5AHRhUrtyf0fU4Unv1bnLChxxKnjW9PFzKhuUygOAy+PR9ZoPtm2LpgIRHFmxvbba3vrRMFwzNGTR1Nu/C43CcvQZw2lxQAoRoyvb+/QWbzZGUfXmWheTsx9sv86mO2Yf56tVCohCQ/m0BCcs+y6hrHi6iEDGzD+/x1rcWcHd/0EoBEa1HN21zqmo6h5f19R8JFwGCiqmD9GLhkUT2iha4eoZ6TI9wQPz6LO8JQFAoqepaOpWeqyXnjLHR5vpL7RDTIZfi5qEjs0OICAHJ4iX6DZVU0d39Pn3lxD5Mp1Jrgj6ClqbRBiBZvSk0rqMP/meBZinLwUn7/fv3P2rN3DGZViyK1uC2gDg5IEGLy1S8tQSQZED4dBRnVwrKAIJEcp4cQprdxRku2bx2GDAAkfMypEm7iluAvUENm3u5cG+tId6gK7+47Vy62+se+5l3VzxrPyNRILKw03E5w9DUtOp0xr1DaG0RAaGt8sPL3xOJxYbfpUyzISi4B164Zmo0bWNNmEz2wWmwAML57Wn28t75l6j2qjbFpADkmUmUSbiN1HQ6TbyW6PW9JSa9GyCbY+d/vyfGpXvEyOWwFRDh+sA/vmG/KxfWSoU6MgajIzKx7DNpLueyfqAW71zxC4dMCvlHBoWzj++jBRG9qOX6foI7KUkuGE4BA5AfBJt6sligzJc1DA0xpQPCdgHEYqmzhHR/mNOVL294kJ3EmEv4kOeUAgoRgHAteYbBmCIZtEsuQooI6aOfU3KInGSwO8vigKxaLPVRMvnlQrWXe5jEKuFESTrl5VNR1gmKxAamBJNhQ47rgPSbgAzyG5ABPCrZBYkkw2RCJVBN8XHu8J90+agDQs5FSmYpEhVO3VueB2TaOMrHBGQnCmkwnYtNFhMWH13nAGfDwrnYMIhCjzsaF8wlKfZlFdBuQqjvWRqkjKBOwG2Ct/m9s5OWReQUBItRX2IYOokFGs5FEN4Pqy8LQLHZ7usYvcP9IikjFBbjDt4StZe8JOFV3SMhdjnqAdw5f4+95+voMGNW10LhvHOxaMzJwlJv2iOFDBYCQvPngQY9sibYJwJyHpWOFO8/mG00vEaGlmWuktijis6xKDBo23Th2KThVznlWZShQSY0mvKWeqgUkALXCQdE9uu2JpDDGcwPICCXmF8lx6LlwnN847uQLZQB5FqSQm8JosZGrs3L5N/guQsi/pFSiry9rAwghqUOF01ilXw+MS8dEHkXQBqHhadMhxTVPuIu4TmDQojT+PlJO64k5z44MaFFPwABSDK/SgmAug92lBMD7KPaTzI8P1Ub3ztZlxkS2hYQReQAbOaD23n3e4Haa7g9RchEWZ5z6fhwQN4m5Tk4bVg+50ES6tMYSUcw7BCdLb5BydGf/sizuBIgtrl8gV98EG1x+u2qHoW7DLq3t5RCADLCMFyAgQcXnzy5eFE6B83hlFAA30AdP0BkZ0CAA4Izf5mYGRiVJGVBDwALE498qggI8E1VKzwRdfpGlNhHAchLdvrBRbz/k8FLyIr7XawBBmAZb94Ml540PKFxcUDaECdVItL/TwEg4WwACgABEQ/JuizxELCPcHEzYHqjnHyaNcrARX5r6REEk2ZYUgCCnMUG7H/9HgX/S6ZkBCeyEWYT+YjhPV3wO3iYmQPCNrnlkUYCoZNUWAMpomFV4aIJVQXT/Z4oMTa0OW5r2DRTO0TZZPrO67gdsgw7nAZyWvfUOCeNMPmqLOJ7Yutc5VRu07egOPIl69elBYgMkaRFhIKD+PxiAoEJkR/IklGjLAsj08WeCJGzyH0xFA9hpwspRLCsAJh5eRd17PHaHLvES8FZVy1JR4pDVo38BB0QnFtdo6BSJciZifBaUDqCEVP/L8KkJ3F2VpF0/z+XbXXKAE8dBI28VeHhj8A1Twa3uHpDIdzpYuMvc5Yz5g/rdntjY6Pd7r+lynocn/1dq+N/3IlCcCabPACZdjdearhk9zv1JIpNOrvaWJqQ3uCUiRh6fzoDQmrOZoVW/PnzZzvOYNP153KS86n/G3wU58nkLTTU70X2BfcC6v8oHC1z12fBlDICeHz5PxvBCrBz+koa5+Aw5azgKh/5re2NZ9AuJWfZopVlcaJa+61uwVaXokXtDzk1xq2QjE0kTaSCGcJHCdbi3lVtG5xcEhSEQAZG4KN+F7QJn0FdUONQfuYhxLBq+1jossXL2AN6okRSHSaFX+VcUqhV8DkonmvYr4G0TRYkUzYcuvtNTSaTajLcT2b5CKX6TIMWtIlME2fwM037CVvQH8NmJ86yviwbd6ehZrNJ5FMpfKAMvjEpN89a+nGO2TkrJqdho8LTIu2fa8ULjs9KwVPdEguAL5vLv1ErfB/L1Koe37PhzQpLdZhsHHzyLN4wlLLr4k3iSSeUBEMt8LlPiDt83wPK5AEYS6myfpBLUrWhup5K6meHODWJ0wEuXR2FWgBOq0mjB6k6chqgVl3Nn5R02hKGTYDiVJOibXK+sSzNoJZPeTlrdDBNqk6lrLHewFwrU13C0ZP/fFKttfNI4xg/lbJfdJ+txSVMNFFShZi5Dz6mVku61NP9fgNYVuV+vhQrImpDxy2PqCGjS/TqBwX51XuVc4Iwb4duM/PqXCOqcbnsCDczHjFXKmsuQsqFV3Pqx6bgTYTvkU+dpKcJCCWpuRyqSFykRDpqua7rxlJKHUmnhcmavkCO2Owa7edh1ck9FA1gy46cJobUwDZTWb7XEXk1fZpBc3Y4rQpzV00ZFKnzq5R4m3g//7qWHlZHKD8CEBA1rZvJWYc2WN4q9BvX1q+STjvr/nzGz+IFuD9Clx+mmwyrPDtgAKcu3qgSINlh/d7D9GD6JUZsKJSza+k0f0TdMzxIHxTvWFtL4wZBuWYTF6ZJp9U6XRrTAqhpcd30cPoaaaUICP6yJl6jx5sAfZHoamuCQvhl5ixJDv9AhZMOO10gF/5vvgs22pPfzxjp14oyRkMRro+xZ/jz/WdjejtRfNdFU28du49/eybeTXx27NmzsWf37z/Db0qRCMGLPqN34p/18Yzepktc+oVeGnumbOt+B+WZ/jn8Ihkp4iI/mrIR6PLP7oupiNeUMf2S+OMzfnc+QfEj3ZEmjc9Ac7t/3xLSxWvQC7QE/GJAV+L3HlPGrDOktdInZb4srpZ/GGlMul8yLFf5/wHMBNTQ0dB3jwAAAABJRU5ErkJggg==";
const STATUS = ["Lead", "Booked", "Attended 1x", "Engaged (2-3x)", "Member (4+)", "Advocate"];
const STATUS_COLOR = {
  "Lead": "#9FB2CC", "Booked": "#6FA8E8", "Attended 1x": "#3F87DC",
  "Engaged (2-3x)": "#2F6FD0", "Member (4+)": "#234E9E", "Advocate": "#13245C",
};

/* ---------- Client segmentation ---------- */
const CLIENT_TYPE = [
  "First-time attendee", "Repeat attendee", "Member", "Advocate",
  "Referral source", "Private client", "Studio attendee", "Virtual attendee",
  "Corporate attendee", "High-value lead", "Past client — reactivate",
];
const CLIENT_TYPE_COLOR = {
  "First-time attendee":       "#9FB2CC",
  "Repeat attendee":           "#5FB0F2",
  "Member":                    "#2F6FD0",
  "Advocate":                  "#4A8C6F",
  "Referral source":           "#D9892B",
  "Private client":            C.brand,
  "Studio attendee":           "#7B68EE",
  "Virtual attendee":          "#6BB8A0",
  "Corporate attendee":        "#13245C",
  "High-value lead":           "#E1A020",
  "Past client — reactivate":  "#C0573F",
};
const INTENT_TAGS = [
  "Stress relief", "Anxiety", "Burnout", "Performance", "Grief",
  "Letting go", "Self-confidence", "Nervous system reset",
  "Transformation seeker", "Spiritual growth", "Corporate wellness",
];
const TAG_COLOR = {
  "Stress relief":        "#3A8BCD",
  "Anxiety":              "#5FB0F2",
  "Burnout":              "#D9892B",
  "Performance":          "#4A8C6F",
  "Grief":                "#7B68EE",
  "Letting go":           "#9B7EC8",
  "Self-confidence":      "#E1A020",
  "Nervous system reset": "#2F6FD0",
  "Transformation seeker":"#C0573F",
  "Spiritual growth":     "#8B4E9E",
  "Corporate wellness":   "#13245C",
};
const STAGE = [
  "Target identified", "Researched", "Initial outreach sent", "Follow-up needed",
  "Discovery call booked", "Demo session offered", "Demo completed",
  "Pilot proposed", "Agreement sent", "Agreement signed",
  "First session scheduled", "Pilot completed", "Recurring partner", "Lost / not a fit",
];
const STAGE_COLOR = {
  "Target identified":       "#C5D5E8",
  "Researched":              "#A8BFDA",
  "Initial outreach sent":   "#8AAFD0",
  "Follow-up needed":        "#D9892B",
  "Discovery call booked":   "#6FA8E8",
  "Demo session offered":    "#5B9FE0",
  "Demo completed":          "#4A90D9",
  "Pilot proposed":          "#3A7FCC",
  "Agreement sent":          "#2F6FD0",
  "Agreement signed":        "#2661BE",
  "First session scheduled": "#1E52AC",
  "Pilot completed":         "#16429A",
  "Recurring partner":       "#13245C",
  "Lost / not a fit":        "#9FB2CC",
};
const STUDIO_TYPE = ["Yoga", "Gym", "Pilates", "Meditation", "Wellness", "Corporate", "CrossFit", "Dance", "Other"];
// studioType may be a legacy string or a new array — always display as a string
const fmtStudioType = (v) => Array.isArray(v) ? (v.length ? v.join(", ") : "—") : (v || "—");
const CLOSE_PROB = ["Low", "Medium", "High", "Closed Won", "Closed Lost"];
const CLOSE_PROB_COLOR = { Low: "#9FB2CC", Medium: C.gold, High: "#4A8C6F", "Closed Won": "#13245C", "Closed Lost": "#C0573F" };
const CONTRACT_STATUS = ["None", "Drafted", "Sent", "Signed"];

const PARTNER_CHECKLIST_PHASES = [
  {
    id: "pre_sign",
    label: "Before Signing",
    color: "#2E6FB0",
    bg: "#EEF4FF",
    Icon: ClipboardList,
    items: [
      { id: "discovery_call",   label: "Discovery call completed"   },
      { id: "revenue_discussed",label: "Revenue split discussed"    },
      { id: "capacity_confirmed",label: "Capacity confirmed"        },
      { id: "insurance_answered",label: "Insurance question answered"},
      { id: "decision_maker",   label: "Decision maker identified"  },
    ],
  },
  {
    id: "post_sign",
    label: "After Signing",
    color: "#6B5CE7",
    bg: "#EEEAFF",
    Icon: FileSignature,
    items: [
      { id: "agreement_uploaded",label: "Agreement uploaded"        },
      { id: "booking_page",      label: "Booking page created"      },
      { id: "qr_code",           label: "QR code created"           },
      { id: "event_flyer",       label: "Event flyer created"       },
      { id: "studio_email",      label: "Studio email copy sent"    },
      { id: "social_posts",      label: "Social posts sent"         },
      { id: "waiver_link",       label: "Waiver link confirmed"     },
      { id: "payment_flow",      label: "Payment flow tested"       },
    ],
  },
  {
    id: "pre_event",
    label: "Before Event",
    color: "#D9892B",
    bg: "#FFF8ED",
    Icon: CalendarCheck,
    items: [
      { id: "registration_checked",label: "Registration count checked"},
      { id: "reminder_email",    label: "Reminder email sent"       },
      { id: "room_setup",        label: "Room setup confirmed"      },
      { id: "equipment_packed",  label: "Equipment packed"          },
      { id: "arrival_confirmed", label: "Arrival time confirmed"    },
    ],
  },
  {
    id: "post_event",
    label: "After Event",
    color: "#4A8C6F",
    bg: "#E2F0EA",
    Icon: CheckCircle,
    items: [
      { id: "revenue_reconciled",label: "Revenue reconciled"        },
      { id: "studio_paid",       label: "Studio paid"               },
      { id: "followup_sent",     label: "Follow-up sent to attendees"},
      { id: "testimonials_requested", label: "Testimonials requested"},
      { id: "next_date",         label: "Next date proposed"        },
    ],
  },
];
const PARTNER_CHECKLIST = PARTNER_CHECKLIST_PHASES.flatMap(p => p.items.map(i => ({ ...i, phase: p.id })));
const emptyChecklist = () => Object.fromEntries(PARTNER_CHECKLIST.map(i => [i.id, false]));
const FUTYPE = ["24h", "72h", "Referral", "Reactivation"];
const FUTYPE_COLOR = { "24h": "#3F87DC", "72h": "#2F6FD0", "Referral": "#D9892B", "Reactivation": "#9FB2CC" };
/* ---------- CRM Settings (configurable lists) ---------- */
const CRM_SETTINGS_KEY = "sb:crm-settings:v1";
const DEFAULT_CRM_SETTINGS = {
  sources:       ["Post-session", "Referral", "Studio partner", "Instagram", "TikTok", "Email", "LinkedIn", "Direct outreach", "Walk-in", "Other"],
  clientTypes:   ["First-time attendee", "Repeat attendee", "Member", "Advocate", "Referral source", "Private client", "Studio attendee", "Virtual attendee", "Corporate attendee", "High-value lead", "Past client — reactivate"],
  packageTypes:  ["None", "Drop-in", "3-pack", "5-pack", "Membership"],
  referralLevels:["Low", "Medium", "High"],
  offerTypes:    ["Single session", "3-pack", "6-pack", "12-pack", "Private session", "Studio pilot", "Studio recurring agreement", "Corporate event", "Group event", "Referral partner offer"],
  journeys:      ["Breathwork Basics", "Reset & Release", "Nervous System Reset", "Letting Go & Rebirth", "Deep Surrender", "New Moon Ceremony", "Welcome Journey", "Breakthrough Session"],
  journeyDescriptions: [
    { id: "jd1", name: "Breathwork Basics",       description: "" },
    { id: "jd2", name: "Reset & Release",         description: "" },
    { id: "jd3", name: "Nervous System Reset",    description: "" },
    { id: "jd4", name: "Letting Go & Rebirth",    description: "" },
    { id: "jd5", name: "Deep Surrender",          description: "" },
    { id: "jd6", name: "New Moon Ceremony",       description: "" },
    { id: "jd7", name: "Welcome Journey",         description: "" },
    { id: "jd8", name: "Breakthrough Session",    description: "" },
  ],
  clientStatuses:["Lead", "Booked", "Attended 1x", "Engaged (2-3x)", "Member (4+)", "Advocate", "Inactive"],
};
function parseCrmSettings(parsed) {
  if (!parsed || typeof parsed !== "object") return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS));
  const merged = Object.fromEntries(Object.keys(DEFAULT_CRM_SETTINGS).map(k => [k, parsed[k] || DEFAULT_CRM_SETTINGS[k]]));
  if (!Array.isArray(merged.journeyDescriptions) || (merged.journeyDescriptions.length > 0 && typeof merged.journeyDescriptions[0] === "string")) {
    merged.journeyDescriptions = JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS.journeyDescriptions));
  }
  return merged;
}
function loadCrmSettings() {
  try {
    const stored = localStorage.getItem(CRM_SETTINGS_KEY);
    if (!stored) return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS));
    return parseCrmSettings(JSON.parse(stored));
  } catch { return JSON.parse(JSON.stringify(DEFAULT_CRM_SETTINGS)); }
}
// Module-level mutable references (updated when settings load/change)
let _crmSettings = loadCrmSettings();
const getS = () => _crmSettings;

const SOURCE = ["Post-session", "Referral", "Studio partner", "Instagram", "TikTok", "Email", "LinkedIn", "Direct outreach", "Walk-in", "Other"];
const SOURCE_COLOR = { "Post-session": C.brand, "Referral": "#4A8C6F", "Studio partner": "#2F6FD0", "Instagram": "#E1306C", "TikTok": "#010101", "Email": "#D9892B", "LinkedIn": "#0077B5", "Direct outreach": "#7B68EE", "Walk-in": "#9FB2CC", "Other": C.ink3 };
const PACKAGE = ["None", "Drop-in", "3-pack", "5-pack", "Membership"];
const REFERRAL = ["Low", "Medium", "High"];
const REFERRAL_COLOR = { Low: "#9FB2CC", Medium: "#3F87DC", High: "#D9892B" };
const OFFER_TYPE = [
  "Single session", "3-pack", "6-pack", "12-pack",
  "Private session", "Studio pilot", "Studio recurring agreement",
  "Corporate event", "Group event", "Referral partner offer",
];
const OFFER_STATUS = ["Drafted", "Sent", "Viewed", "Follow-up due", "Accepted", "Paid", "Declined", "Expired"];
const OFFER_STATUS_COLOR = {
  "Drafted":        "#9FB2CC",
  "Sent":           "#5FB0F2",
  "Viewed":         "#7B68EE",
  "Follow-up due":  "#D9892B",
  "Accepted":       "#4A8C6F",
  "Paid":           "#2F6FD0",
  "Declined":       "#C0573F",
  "Expired":        "#B0B8C1",
};
const OFFER_PROB = ["10%", "20%", "30%", "40%", "50%", "60%", "70%", "80%", "90%", "100%"];
const OPEN_STATUSES = ["Drafted", "Sent", "Viewed", "Follow-up due"];
const WON_STATUSES  = ["Accepted", "Paid"];
const LOST_STATUSES = ["Declined", "Expired"];

/* ---------- Referral tracking constants ---------- */
const REF_STATUS = ["Referred", "Contacted", "Attended", "Purchased", "Inactive"];
const REF_STATUS_COLOR = {
  "Referred":  "#9FB2CC",
  "Contacted": "#5FB0F2",
  "Attended":  "#3F87DC",
  "Purchased": "#4A8C6F",
  "Inactive":  "#C0573F",
};

/* ── OUTREACH HUB ── */
const OUTREACH_STATUS = ["Not contacted","Messaged","Responded","Demo offered","Demo scheduled","Agreement pending","Won","Declined","Inactive"];
const OUTREACH_STATUS_COLOR = {
  "Not contacted":     "#9E9E9E",
  "Messaged":          "#5FB0F2",
  "Responded":         "#3F87DC",
  "Demo offered":      "#6B5CE7",
  "Demo scheduled":    "#2E6FB0",
  "Agreement pending": "#E07020",
  "Won":               "#4A8C6F",
  "Declined":          "#C0573F",
  "Inactive":          "#AAAAAA",
};
const OUTREACH_WARMTH       = ["Cold","Warm","Hot"];
const OUTREACH_WARMTH_COLOR = { Cold: "#9E9E9E", Warm: "#E09040", Hot: "#C0573F" };
const OUTREACH_TARGET_TYPE  = ["Studio","Referral Partner","Corporate","Gym","Wellness Center","Media","Influencer","Other"];
const OUTREACH_RESPONSE     = ["Pending","Responded","No response","Ghosted","Interested","Not interested"];
const OUTREACH_SOURCE       = ["Instagram DM","Email","Cold outreach","Referral","In person","LinkedIn","Event","Google","Other"];
const OUTREACH_PRIORITY     = ["High","Medium","Low"];
const OUTREACH_PRIORITY_COLOR = { High: "#C0573F", Medium: "#E09040", Low: "#9E9E9E" };

/* ── TESTIMONIALS ── */
const TESTIMONIAL_STATUS = ["Breakthrough noted","Request sent","Received","Approved","Published","Declined"];
const TESTIMONIAL_STATUS_COLOR = {
  "Breakthrough noted": "#D9892B",
  "Request sent":       "#5FB0F2",
  "Received":           "#3F87DC",
  "Approved":           "#6B5CE7",
  "Published":          "#4A8C6F",
  "Declined":           "#C0573F",
};
const TESTIMONIAL_TYPE   = ["Written","Video","Audio","Quote only"];
const TESTIMONIAL_THEMES = [
  "Stress relief","Emotional release","Mental clarity","Emotional breakthrough",
  "Improved sleep","Performance","Grief processing","Anxiety relief",
  "Confidence","Spiritual growth","Nervous system reset","Physical release",
];

/* ── MESSAGE TEMPLATES ── */
const TMPL_CATEGORY = ["Studio Outreach","Studio Sales","Post-Session","Sales & Offers","Engagement","Operations"];
const TMPL_CATEGORY_COLOR = {
  "Studio Outreach": "#6B5CE7",
  "Studio Sales":    "#2E6FB0",
  "Post-Session":    "#4A8C6F",
  "Sales & Offers":  C.brand,
  "Engagement":      "#D9892B",
  "Operations":      "#9E9E9E",
};
const TMPL_CHANNEL       = ["Email","SMS","DM"];
const TMPL_CHANNEL_COLOR = { Email:"#D9892B", SMS:"#4A8C6F", DM:"#E1306C" };
const TMPL_LINKED_TO     = ["clients","partners","sessions","any"];

/* ── Expenses ── */
const EXPENSE_CATEGORY = [
  "Equipment & Supplies","Software & Subscriptions","Marketing & Advertising",
  "Travel & Transport","Education & Training","Professional Services",
  "Insurance","Administrative","Studio & Venue","Other",
];
const EXPENSE_CATEGORY_COLOR = {
  "Equipment & Supplies":    "#2E6FB0",
  "Software & Subscriptions":"#6B5CE7",
  "Marketing & Advertising": "#D9892B",
  "Travel & Transport":      "#2A9D8F",
  "Education & Training":    "#4A8C6F",
  "Professional Services":   "#8E44AD",
  "Insurance":               "#C0392B",
  "Administrative":          "#55627B",
  "Studio & Venue":          "#16A085",
  "Other":                   "#8A96AC",
};
const EXPENSE_PAYMENT_METHOD = ["Credit Card","Bank Transfer","Cash","Check","Other"];
const EXPENSE_RECUR_FREQ     = ["One-time","Monthly","Quarterly","Annual"];

function outreachScore(o, today) {
  let s = 0;
  if (o.warmth === "Hot") s += 40; else if (o.warmth === "Warm") s += 20;
  s += Math.min(30, Math.round((Number(o.revenuePotential) || 0) / 500) * 5);
  if (o.responseStatus === "Interested") s += 15; else if (o.responseStatus === "Responded") s += 8;
  if (o.priority === "High") s += 10; else if (o.priority === "Medium") s += 5;
  const daysOld = !o.lastContact ? 0 : Math.round((new Date(today||new Date()) - new Date(o.lastContact)) / 86400000);
  s = Math.max(0, s - Math.floor(daysOld / 7) * 5);
  return Math.min(100, s);
}

/* ---------- Revenue constants ---------- */
const REV_CHANNEL = [
  "Studio session", "Virtual session", "Private client", "Group package",
  "Corporate event", "Referral partner", "Paid ad", "Organic Instagram",
  "Email list", "Studio partner",
];
const REV_CHANNEL_COLOR = {
  "Studio session":    "#2F6FD0",
  "Virtual session":   "#4A8C6F",
  "Private client":    C.brand,
  "Group package":     "#7B68EE",
  "Corporate event":   "#D9892B",
  "Referral partner":  "#E1306C",
  "Paid ad":           "#C0573F",
  "Organic Instagram": "#E4405F",
  "Email list":        "#D9892B",
  "Studio partner":    "#13245C",
};
const COST_CENTER = [
  "Studio sessions", "Virtual sessions", "Private sessions",
  "Packages", "Corporate", "Referral", "Marketing",
];
const calcNet = (r) =>
  Number(r.gross || 0) - Number(r.stripeFee || 0) - Number(r.studioSplit || 0) -
  Number(r.facilitatorCost || 0) - Number(r.refunds || 0);
const CONTENT_TYPE = ["Transformation", "Education", "Invite", "Testimonial"]; // legacy compat
const PLATFORM = ["Instagram","TikTok","Email","YouTube","LinkedIn","Facebook","Threads","Other"];
const PLATFORM_COLOR = { Instagram:"#E1306C", TikTok:"#010101", Email:"#D9892B", YouTube:"#FF0000", LinkedIn:"#0077B5", Facebook:"#1877F2", Threads:"#000000", Other: C.ink3 };
const CONTENT_STATUS = ["Idea","Draft","Scheduled","Published","Archived"];
const CONTENT_STATUS_COLOR = { "Idea":"#9E9E9E","Draft":"#5FB0F2","Scheduled":"#6B5CE7","Published":"#4A8C6F","Archived":"#CCCCCC" };
const CONTENT_CATEGORY = [
  "Client transformation","Breathwork education","Nervous system regulation",
  "Behind the scenes","Studio partner promotion","Founder story",
  "Testimonials","FAQs","Safety & contraindications","Upcoming sessions",
];
const CONTENT_CAT_COLOR = {
  "Client transformation":      "#C0573F",
  "Breathwork education":       "#3F87DC",
  "Nervous system regulation":  "#4A8C6F",
  "Behind the scenes":          "#9B7A2E",
  "Studio partner promotion":   "#6B5CE7",
  "Founder story":              "#D9892B",
  "Testimonials":               "#2E6FB0",
  "FAQs":                       "#7B68EE",
  "Safety & contraindications": "#9E9E9E",
  "Upcoming sessions":          C.brand,
};
const CONTENT_CTA = ["Book a session","DM me","Link in bio","Sign up","Comment below","Save this","Share with a friend","None"];

const SESSION_STATUS = ["Planned", "Booking open", "Promotion active", "Almost full", "Completed", "Follow-up pending", "Closed out"];
const SESSION_STATUS_COLOR = {
  "Planned":           "#9FB2CC",
  "Booking open":      "#6FA8E8",
  "Promotion active":  "#D9892B",
  "Almost full":       "#4A8C6F",
  "Completed":         C.brand,
  "Follow-up pending": "#C0573F",
  "Closed out":        C.brandDeep,
};
const JOURNEY_TYPES = ["Reset & Release", "Letting Go & Rebirth", "Nervous System Reset", "Breathwork Basics", "Deep Surrender", "Heart Opening", "Energy Activation", "Grief & Healing", "New Moon Ceremony", "Custom"];
const SETUP_STATUS = ["Not started", "In progress", "Ready"];

const SESSION_CHECKLIST = [
  // Pre-session — studio
  { id: "room_booked",        label: "Room booking confirmed with studio",          phase: "Pre-Session",  virtual: false },
  { id: "capacity_set",       label: "Capacity communicated to studio",             phase: "Pre-Session",  virtual: false },
  { id: "promo_sent",         label: "Promotional push sent to studio list",        phase: "Pre-Session",  virtual: false },
  { id: "equipment_packed",   label: "Equipment packed (headset, music, props)",    phase: "Pre-Session",  virtual: false },
  { id: "zoom_tested",        label: "Zoom setup & audio tested",                  phase: "Pre-Session",  virtual: true  },
  { id: "room_setup_done",    label: "Room setup confirmed",                        phase: "Pre-Session",  virtual: false },
  { id: "audio_tested",       label: "Music & headset tested",                     phase: "Pre-Session",  virtual: false },
  { id: "tech_room_setup",    label: "Technical room setup complete, music and headsets tested", phase: "Pre-Session", virtual: false },
  { id: "space_prepared",     label: "Personal space prepared (quiet, good light)", phase: "Pre-Session",  virtual: true  },
  { id: "water_nearby",       label: "Water nearby for you",                        phase: "Pre-Session",  virtual: true  },
  // Post-session — shared
  { id: "attendance_logged",  label: "Attendance count logged",                     phase: "Post-Session", virtual: false },
  { id: "revenue_recorded",   label: "Revenue recorded & split calculated",         phase: "Post-Session", virtual: false },
  { id: "revenue_virtual",    label: "Revenue recorded",                            phase: "Post-Session", virtual: false },
  { id: "studio_paid",        label: "Studio split paid or invoiced",               phase: "Post-Session", virtual: false },
  { id: "testimonials_done",  label: "Testimonials captured from attendees",        phase: "Post-Session", virtual: true  },
  { id: "followup_sent",      label: "24h follow-up email sent to attendees",       phase: "Post-Session", virtual: true  },
  { id: "rebook_offered",     label: "Rebook offer made to attendees",              phase: "Post-Session", virtual: true  },
  { id: "referrals_asked",    label: "Referrals requested from advocates",          phase: "Post-Session", virtual: true  },
  { id: "notes_written",      label: "Session notes & learnings written",           phase: "Post-Session", virtual: true  },
];

/* ── EQUIPMENT & SETUP CHECKLIST ── */
const EQUIP_CHECKLIST_PHASES = [
  {
    id: "pack", label: "Pack & Equipment", color: "#2E6FB0", icon: "🎒",
    items: [
      { id: "eq_headsets",       label: "Primary headsets packed & charged",          virtual: false },
      { id: "eq_backup_headset", label: "Backup headset packed",                      virtual: false },
      { id: "eq_chargers",       label: "Chargers & power banks in bag",              virtual: false },
      { id: "eq_extension",      label: "Extension cords packed",                     virtual: false },
      { id: "eq_eye_masks",      label: "Eye masks (count matches registration)",      virtual: false },
      { id: "eq_mats",           label: "Mats/blankets confirmed (studio provided or packed)", virtual: false },
      { id: "eq_speaker",        label: "Speaker / audio backup ready",               virtual: false },
    ],
  },
  {
    id: "virtual_setup", label: "Virtual Setup", color: "#2E6FB0", icon: "💻",
    items: [
      { id: "eq_zoom_tested",    label: "Zoom audio, video & screen share tested",    virtual: true  },
      { id: "eq_headset_v",      label: "Headset charged and tested",                 virtual: true  },
      { id: "eq_camera",         label: "Camera positioned, background clean & lit",  virtual: true  },
      { id: "eq_do_not_disturb", label: "Phone on DND, notifications silenced",       virtual: true  },
    ],
  },
  {
    id: "content", label: "Content & Tech", color: "#6B5CE7", icon: "🎵",
    items: [
      { id: "eq_playlist",       label: "Playlist/journey downloaded offline",         virtual: false },
      { id: "eq_playlist_v",     label: "Playlist/journey ready & queued",             virtual: true  },
      { id: "eq_wifi",           label: "Wi-Fi confirmed at venue (or offline ready)", virtual: false },
      { id: "eq_wifi_v",         label: "Strong internet connection confirmed",        virtual: true  },
      { id: "eq_waiver_qr",      label: "Waiver QR code printed or accessible",       virtual: false },
      { id: "eq_checkin_list",   label: "Check-in list printed or on device",         virtual: false },
    ],
  },
  {
    id: "venue", label: "Venue & Day-Of", color: "#D9892B", icon: "📍",
    items: [
      { id: "eq_arrival_time",   label: "Arrival time confirmed (45–60 min early)",   virtual: false },
      { id: "eq_space_v",        label: "Personal space quiet, door locked/sign posted", virtual: false },
      { id: "eq_room_lighting",  label: "Room lighting tested & adjusted",            virtual: false },
      { id: "eq_lighting_v",     label: "Lighting flattering and distraction-free",   virtual: false },
      { id: "eq_water_tissues",  label: "Water & tissues available in room",          virtual: false },
    ],
  },
  {
    id: "safety", label: "Safety & Facilitation", color: "#4A8C6F", icon: "🛡️",
    items: [
      { id: "eq_emergency",      label: "Emergency contact process confirmed",         virtual: false },
      { id: "eq_contraindication", label: "Contraindication reminder shared with attendees", virtual: true },
      { id: "eq_closing_script", label: "Closing/integration script reviewed",        virtual: true  },
    ],
  },
];
const EQUIP_CHECKLIST = EQUIP_CHECKLIST_PHASES.flatMap(p => p.items.map(i => ({ ...i, phase: p.id })));
const emptyEquipChecklist = () => Object.fromEntries(EQUIP_CHECKLIST.map(i => [i.id, false]));
const SESSION_CHECKLIST_PHASES = ["Pre-Session", "Post-Session"];
const SESSION_PHASE_COLOR = { "Pre-Session": C.brand, "Post-Session": "#4A8C6F" };
const emptySessionChecklist = () => Object.fromEntries(SESSION_CHECKLIST.map((i) => [i.id, false]));

/* ============================================================
   FOLLOW-UP SEQUENCE ENGINE
   ============================================================ */
const FU_STEPS = [
  { id: "same_day", label: "Same Day",    delayDays: 0,  channel: "text",  accent: "#3A8BCD" },
  { id: "h24",      label: "24 Hours",    delayDays: 1,  channel: "text",  accent: "#7B68EE" },
  { id: "h72",      label: "48–72 Hours", delayDays: 3,  channel: "email", accent: "#D9892B" },
  { id: "d5",       label: "5–7 Days",    delayDays: 6,  channel: "email", accent: "#4A8C6F" },
  { id: "d14",      label: "14–21 Days",  delayDays: 14, channel: "text",  accent: "#9B7EC8" },
];

const FU_TEMPLATES = {
  same_day:
`Hi {first_name}! Thank you so much for breathing with me today. 💙 You showed up and that matters. Tonight: drink lots of water, take it easy, and let your body rest. Your nervous system is integrating something real. I'm honored to have shared that space with you. 🌊`,

  h24:
`Hey {first_name} — just checking in. How are you feeling today, one day after? Sometimes the shift is quiet at first, and then it lands. Anything come up for you? I'd love to hear — no pressure, just holding space. 🙏`,

  h72:
`Hi {first_name},

I've been thinking about you since our session.

If what happened in that room opened something for you, the best move right now is not to let it close. The 72-hour window after breathwork is real — this is when decisions stick.

I'd love to invite you to commit to three sessions. Clients who come three times in a row see a completely different result than those who try it once and wait.

I have a 3-pack available — three full sessions. Want me to hold a spot for you?

Just reply here and I'll take care of it. Breathing with you was an honor.`,

  d5:
`Hi {first_name},

It's been about a week since our session. I hope you've been noticing little shifts — in how you breathe when things get stressful, in how fast you come back to yourself.

Two quick asks:

1. Would you be willing to share a few words about your experience? A short testimonial helps others find this work and takes about 2 minutes. I'd be so grateful.

2. Do you know someone going through something hard — stress, grief, anxiety, burnout? A personal introduction from you means everything to them and to me.

Either way — thank you for showing up. It matters more than you know.`,

  d14:
`Hey {first_name} — it's been a couple of weeks since we breathed together. I've been thinking about you. How are things?

I have a session coming up that I think would be exactly right for where you are right now. I'd love to see you back in the room. 💙`,
};

function interpolateTemplate(template, client, seq) {
  const fullName = (client?.name || "there").trim();
  const firstName = fullName.split(" ")[0];
  return (template || "")
    .replace(/\{name\}/g, fullName)
    .replace(/\{first_name\}/g, firstName)
    .replace(/\{session_name\}/g, seq?.sessionName || "our session")
    .replace(/\{session_date\}/g, seq?.sessionDate ? fmtDate(seq.sessionDate) : "");
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function makeSequenceSteps(startDate) {
  return FU_STEPS.map(s => ({
    stepId: s.id,
    dueDate: addDays(startDate, s.delayDays),
    sent: false,
    sentAt: "",
    notes: "",
  }));
}

/* ---------- Seed data (from the six source files, relations wired) ---------- */
const SEED = {
  partners: [
    { id: "sp1", name: "YogaSix Walnut Creek", studioType: "Yoga", location: "Walnut Creek, CA", contact: "Alyssa Tran", role: "Manager", email: "alyssa@example.com", phone: "555-0201", stage: "Recurring partner", estimatedCommunitySize: 320, bestFitJourney: "Reset & Release", revenuePotential: 2400, closeProbability: "Closed Won", revShare: "70/30 split (us/studio)", contractStatus: "Signed", outreachDate: "2026-03-01", lastTouch: "2026-06-11", nextAction: "2026-06-18", avgAttendance: 14, sessionsPerMonth: 4, insuranceReqs: "COI on file", promotionCommitments: "Monthly IG story + email to list", notes: "Thursday Reset is the anchor class; strong word of mouth. Alyssa is a champion.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: true, booking_page: true, qr_code: true, event_flyer: true, studio_email: true, social_posts: true, waiver_link: true, payment_flow: true, registration_checked: true, reminder_email: true, room_setup: true, equipment_packed: true, arrival_confirmed: true, revenue_reconciled: true, studio_paid: true, followup_sent: true, testimonials_requested: true, next_date: true } },
    { id: "sp2", name: "CorePower Lafayette", studioType: "Yoga", location: "Lafayette, CA", contact: "Mike Donnelly", role: "Owner", email: "mike@example.com", phone: "555-0202", stage: "Demo completed", estimatedCommunitySize: 280, bestFitJourney: "Letting Go & Rebirth", revenuePotential: 1800, closeProbability: "High", revShare: "Flat room fee $75", contractStatus: "None", outreachDate: "2026-05-10", lastTouch: "2026-06-03", nextAction: "2026-06-16", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "Needs COI before pilot", promotionCommitments: "TBD — discussing newsletter feature", notes: "Demo went well 6/3. Mike is interested but cautious. Follow up with pilot proposal this week.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: false, decision_maker: true, agreement_uploaded: false, booking_page: false, qr_code: false, event_flyer: false, studio_email: false, social_posts: false, waiver_link: false, payment_flow: false, registration_checked: false, reminder_email: false, room_setup: false, equipment_packed: false, arrival_confirmed: false, revenue_reconciled: false, studio_paid: false, followup_sent: false, testimonials_requested: false, next_date: false } },
    { id: "sp3", name: "The Still Point", studioType: "Meditation", location: "Pleasant Hill, CA", contact: "Renee Park", role: "Director", email: "renee@example.com", phone: "555-0203", stage: "Pilot proposed", estimatedCommunitySize: 140, bestFitJourney: "Nervous System Reset", revenuePotential: 1200, closeProbability: "Medium", revShare: "80/20 split (us/studio)", contractStatus: "Drafted", outreachDate: "2026-04-15", lastTouch: "2026-06-05", nextAction: "2026-06-14", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "COI + liability waiver required", promotionCommitments: "4-week pilot feature on their blog", notes: "4-week Sunday evening pilot proposed. Contract drafted but not returned. Renee responsive over email.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: false, booking_page: false, qr_code: false, event_flyer: false, studio_email: false, social_posts: false, waiver_link: false, payment_flow: false, registration_checked: false, reminder_email: false, room_setup: false, equipment_packed: false, arrival_confirmed: false, revenue_reconciled: false, studio_paid: false, followup_sent: false, testimonials_requested: false, next_date: false } },
    { id: "sp4", name: "Flow State Studio", studioType: "Wellness", location: "Concord, CA", contact: "Tara Iverson", role: "Owner", email: "tara@example.com", phone: "555-0204", stage: "Initial outreach sent", estimatedCommunitySize: 90, bestFitJourney: "Breathwork Basics", revenuePotential: 900, closeProbability: "Low", revShare: "TBD", contractStatus: "None", outreachDate: "2026-06-09", lastTouch: "2026-06-09", nextAction: "2026-06-17", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "Warm intro from Dana. Sent intro email 6/9. Waiting on reply.", checklist: emptyChecklist() },
    { id: "sp5", name: "Lotus & Pine", studioType: "Yoga", location: "Danville, CA", contact: "Geoff Adams", role: "Manager", email: "geoff@example.com", phone: "555-0205", stage: "Recurring partner", estimatedCommunitySize: 500, bestFitJourney: "Deep Surrender", revenuePotential: 5200, closeProbability: "Closed Won", revShare: "60/40 split (us/studio)", contractStatus: "Signed", outreachDate: "2026-01-15", lastTouch: "2026-06-10", nextAction: "2026-06-20", avgAttendance: 18, sessionsPerMonth: 8, insuranceReqs: "COI on file + annual renewal", promotionCommitments: "Co-branded social posts + monthly email feature", notes: "Two weekly slots plus monthly workshop. Best earner. Geoff wants to add a Friday morning slot.", checklist: { discovery_call: true, revenue_discussed: true, capacity_confirmed: true, insurance_answered: true, decision_maker: true, agreement_uploaded: true, booking_page: true, qr_code: true, event_flyer: true, studio_email: true, social_posts: true, waiver_link: true, payment_flow: true, registration_checked: true, reminder_email: true, room_setup: true, equipment_packed: true, arrival_confirmed: true, revenue_reconciled: true, studio_paid: true, followup_sent: true, testimonials_requested: true, next_date: true } },
  ],
  clients: [
    { id: "c1", name: "Jordan Lee",   phone: "555-0101", email: "jordan@example.com", source: "Studio partner",  status: "Lead",          clientType: "High-value lead",          tags: ["Anxiety","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-12", packageType: "None",       lifetimeValue: 0,   notes: "Found us via YogaSix flyer; anxious about first session, wants calm intro",      referral: "Low"    },
    { id: "c2", name: "Maya Chen",    phone: "555-0102", email: "maya@example.com",   source: "Instagram",       status: "Booked",        clientType: "First-time attendee",      tags: ["Burnout","Stress relief"],                              firstSession: "",           sessionsAttended: 0,  lastSession: "",           nextSession: "2026-06-14", packageType: "None",       lifetimeValue: 0,   notes: "DM'd after breathwork reel; dealing with work burnout",                         referral: "Medium" },
    { id: "c3", name: "Chris Okafor", phone: "555-0103", email: "chris@example.com",  source: "Referral",        status: "Attended 1x",   clientType: "Repeat attendee",          tags: ["Letting go","Transformation seeker"],                   firstSession: "2026-06-01", sessionsAttended: 1,  lastSession: "2026-06-01", nextSession: "2026-06-15", packageType: "Drop-in",    lifetimeValue: 35,  notes: "Big emotional release in first session; referred by Maya",                      referral: "High"   },
    { id: "c4", name: "Priya Nair",   phone: "555-0104", email: "priya@example.com",  source: "Post-session",    status: "Engaged (2-3x)", clientType: "Repeat attendee",         tags: ["Nervous system reset","Stress relief"],                 firstSession: "2026-05-10", sessionsAttended: 3,  lastSession: "2026-06-07", nextSession: "2026-06-13", packageType: "3-pack",     lifetimeValue: 105, notes: "Sleep issues improving; mentioned wanting partner to join",                     referral: "Medium" },
    { id: "c5", name: "Sam Rivera",   phone: "555-0105", email: "sam@example.com",    source: "Studio partner",  status: "Member (4+)",   clientType: "Member",                   tags: ["Grief","Letting go","Transformation seeker"],            firstSession: "2026-04-02", sessionsAttended: 9,  lastSession: "2026-06-09", nextSession: "2026-06-16", packageType: "Membership", lifetimeValue: 540, notes: "Core regular; grief processing journey, very committed",                        referral: "High"   },
    { id: "c6", name: "Dana Wolfe",   phone: "555-0106", email: "dana@example.com",   source: "Referral",        status: "Advocate",      clientType: "Advocate",                 tags: ["Spiritual growth","Transformation seeker"],             firstSession: "2026-03-15", sessionsAttended: 12, lastSession: "2026-06-10", nextSession: "2026-06-17", packageType: "5-pack",     lifetimeValue: 610, notes: "Has referred 3 friends; natural community builder",                            referral: "High"   },
  ],
  sessions: [
    { id: "se1", name: "YogaSix Thursday Reset 6/4", studioId: "sp1", date: "2026-06-04", time: "7:00 PM", status: "Closed out", journey: "Reset & Release", capacity: 18, registered: 15, attendance: 13, paidAttendees: 13, waivers: 12, noShows: 2, revenue: 455, studioSplit: 136.5, netRevenue: 318.5, conversion: 0.31, packagesSold: 2, referralsGenerated: 1, equipmentNeeded: "Headset, portable speaker, lavender oil", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 1, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Sound bath close landed well; 2 three-packs sold at door", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
    { id: "se2", name: "YogaSix Thursday Reset 6/11", studioId: "sp1", date: "2026-06-11", time: "7:00 PM", status: "Follow-up pending", journey: "Reset & Release", capacity: 18, registered: 18, attendance: 16, paidAttendees: 16, waivers: 15, noShows: 2, revenue: 560, studioSplit: 168, netRevenue: 392, conversion: 0.38, packagesSold: 3, referralsGenerated: 2, equipmentNeeded: "Headset, portable speaker, eye masks", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 2, followUpSent: false, rebookOfferSent: false, referralsRequested: false, notes: "Best turnout yet; Priya brought a friend. Room hit capacity — talk to Alyssa about expanding.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: false, testimonials_done: true, followup_sent: false, rebook_offered: false, referrals_asked: false, notes_written: false } },
    { id: "se3", name: "Lotus & Pine Sunday Slow Down 6/7", studioId: "sp5", date: "2026-06-07", time: "5:00 PM", status: "Closed out", journey: "Deep Surrender", capacity: 24, registered: 21, attendance: 19, paidAttendees: 19, waivers: 18, noShows: 2, revenue: 665, studioSplit: 266, netRevenue: 399, conversion: 0.26, packagesSold: 2, referralsGenerated: 0, equipmentNeeded: "Headset, speaker, singing bowl, blankets", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 0, followUpSent: true, rebookOfferSent: true, referralsRequested: false, notes: "Room near capacity; pitch membership earlier next time. No testimonials captured — add request at end.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: false, followup_sent: true, rebook_offered: true, referrals_asked: false, notes_written: true } },
    { id: "se4", name: "Lotus & Pine New Moon Workshop 6/9", studioId: "sp5", date: "2026-06-09", time: "7:30 PM", status: "Closed out", journey: "New Moon Ceremony", capacity: 30, registered: 25, attendance: 22, paidAttendees: 20, waivers: 20, noShows: 3, revenue: 1100, studioSplit: 440, netRevenue: 660, conversion: 0.18, packagesSold: 1, referralsGenerated: 3, equipmentNeeded: "Headset, speaker, candles, intention cards, journal prompts", roomSetupStatus: "Ready", musicSetupStatus: "Ready", testimonialsCapt: 3, followUpSent: true, rebookOfferSent: true, referralsRequested: true, notes: "Workshop format converts slower but generates referrals. 2 unpaid attendees — tighten payment flow.", checklist: { room_booked: true, capacity_set: true, booking_live: true, promo_sent: true, equipment_packed: true, room_setup_done: true, audio_tested: true, waivers_shared: true, attendance_logged: true, revenue_recorded: true, studio_paid: true, testimonials_done: true, followup_sent: true, rebook_offered: true, referrals_asked: true, notes_written: true } },
  ],
  offers: [
    { id: "o1",  name: "Chris / 3-pack",                  clientId: "c3", offerType: "3-pack",                    price: 105, status: "Sent",           dateOffered: "2026-06-01", expireDate: "2026-06-15", followUpDate: "2026-06-08",  probability: "60%", source: "Post-session",    notes: "Said he'd think about it",         reasonLost: "" },
    { id: "o2",  name: "Priya / 3-pack",                  clientId: "c4", offerType: "3-pack",                    price: 105, status: "Paid",           dateOffered: "2026-05-10", expireDate: "",           followUpDate: "",           probability: "100%",source: "Post-session",    notes: "",                                 reasonLost: "" },
    { id: "o3",  name: "Sam / 6-pack",                    clientId: "c5", offerType: "6-pack",                    price: 195, status: "Accepted",       dateOffered: "2026-04-20", expireDate: "",           followUpDate: "",           probability: "90%", source: "Referral",        notes: "Loved the first session",          reasonLost: "" },
    { id: "o4",  name: "Maya / Single session",           clientId: "c2", offerType: "Single session",            price: 35,  status: "Follow-up due",  dateOffered: "2026-06-10", expireDate: "2026-06-20", followUpDate: "2026-06-13", probability: "50%", source: "Instagram",       notes: "Interested, needs nudge",          reasonLost: "" },
    { id: "o5",  name: "Dana / 6-pack",                   clientId: "c6", offerType: "6-pack",                    price: 195, status: "Paid",           dateOffered: "2026-05-28", expireDate: "",           followUpDate: "",           probability: "100%",source: "Studio partner",  notes: "",                                 reasonLost: "" },
    { id: "o6",  name: "Jordan / Single session",         clientId: "c1", offerType: "Single session",            price: 35,  status: "Declined",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "0%",  source: "Direct outreach", notes: "",                                 reasonLost: "Not the right time" },
    { id: "o7",  name: "CorePower Berkeley / Studio pilot",clientId: "",  offerType: "Studio pilot",              price: 300, status: "Sent",           dateOffered: "2026-06-09", expireDate: "2026-06-23", followUpDate: "2026-06-14", probability: "70%", source: "Direct outreach", notes: "Very interested, follow up Friday", reasonLost: "" },
    { id: "o8",  name: "Lotus & Pine / Recurring",        clientId: "",   offerType: "Studio recurring agreement",price: 600, status: "Accepted",       dateOffered: "2026-05-15", expireDate: "",           followUpDate: "",           probability: "100%",source: "Referral",        notes: "Signed May 20",                    reasonLost: "" },
    { id: "o9",  name: "Maya / 3-pack",                   clientId: "c2", offerType: "3-pack",                    price: 105, status: "Viewed",         dateOffered: "2026-06-12", expireDate: "2026-06-26", followUpDate: "2026-06-14", probability: "65%", source: "Post-session",    notes: "Opened the email twice",           reasonLost: "" },
    { id: "o10", name: "Corporate wellness / Group event", clientId: "",  offerType: "Group event",               price: 450, status: "Drafted",        dateOffered: "2026-06-13", expireDate: "2026-06-27", followUpDate: "2026-06-16", probability: "40%", source: "LinkedIn",        notes: "HR lead, warm intro via Sam",      reasonLost: "" },
    { id: "o11", name: "Past lead / 3-pack",              clientId: "",   offerType: "3-pack",                    price: 105, status: "Expired",        dateOffered: "2026-05-01", expireDate: "2026-05-15", followUpDate: "",           probability: "0%",  source: "Instagram",       notes: "",                                 reasonLost: "No response" },
    { id: "o12", name: "Priya / Private session",         clientId: "c4", offerType: "Private session",           price: 150, status: "Accepted",       dateOffered: "2026-06-05", expireDate: "",           followUpDate: "",           probability: "90%", source: "Post-session",    notes: "Requested after group session",    reasonLost: "" },
  ],
  revenue: [
    { id: "rv1",  name: "YogaSix Thursday Reset 6/11",      date: "2026-06-11", channel: "Studio session",   source: "Studio partner",  campaign: "",              sessionId: "s3", clientId: "",  gross: 350,  stripeFee: 10.50, studioSplit: 105,  facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "8 paid × $43.75" },
    { id: "rv2",  name: "Lotus & Pine New Moon 6/9",         date: "2026-06-09", channel: "Studio session",   source: "Studio partner",  campaign: "",              sessionId: "s2", clientId: "",  gross: 280,  stripeFee: 8.40,  studioSplit: 84,   facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "7 paid × $40" },
    { id: "rv3",  name: "Virtual Sunday Session 6/8",        date: "2026-06-08", channel: "Virtual session",  source: "Email list",      campaign: "June newsletter",sessionId: "",   clientId: "",  gross: 420,  stripeFee: 12.60, studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Virtual sessions",  notes: "12 paid × $35" },
    { id: "rv4",  name: "Priya private session 6/5",         date: "2026-06-05", channel: "Private client",   source: "Post-session",    campaign: "",              sessionId: "",   clientId: "c4",gross: 150,  stripeFee: 4.50,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Private sessions",  notes: "" },
    { id: "rv5",  name: "Dana 6-pack 5/28",                  date: "2026-05-28", channel: "Group package",    source: "Studio partner",  campaign: "",              sessionId: "",   clientId: "c6",gross: 195,  stripeFee: 5.85,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv6",  name: "CorePower Berkeley pilot 6/1",      date: "2026-06-01", channel: "Studio session",   source: "Direct outreach", campaign: "",              sessionId: "s1", clientId: "",  gross: 300,  stripeFee: 9.00,  studioSplit: 90,   facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "Pilot, 6 attendees" },
    { id: "rv7",  name: "Sam 6-pack 4/22",                   date: "2026-04-22", channel: "Group package",    source: "Referral",        campaign: "",              sessionId: "",   clientId: "c5",gross: 195,  stripeFee: 5.85,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv8",  name: "Lotus & Pine monthly agreement 5/15",date: "2026-05-15", channel: "Studio partner",  source: "Studio partner",  campaign: "",              sessionId: "",   clientId: "",  gross: 600,  stripeFee: 18.00, studioSplit: 180,  facilitatorCost: 0,   refunds: 0,  costCenter: "Studio sessions",   notes: "Monthly partner fee" },
    { id: "rv9",  name: "Virtual Sunday Session refund 6/8", date: "2026-06-08", channel: "Virtual session",  source: "Direct outreach", campaign: "",              sessionId: "",   clientId: "c1",gross: 0,    stripeFee: 0,     studioSplit: 0,    facilitatorCost: 0,   refunds: 35, costCenter: "Virtual sessions",  notes: "Jordan requested refund" },
    { id: "rv10", name: "Priya 3-pack 5/10",                 date: "2026-05-10", channel: "Group package",    source: "Post-session",    campaign: "",              sessionId: "",   clientId: "c4",gross: 105,  stripeFee: 3.15,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Packages",          notes: "" },
    { id: "rv11", name: "Corporate wellness event 6/20",     date: "2026-06-20", channel: "Corporate event",  source: "LinkedIn",        campaign: "Corp outreach", sessionId: "",   clientId: "",  gross: 450,  stripeFee: 13.50, studioSplit: 0,    facilitatorCost: 100, refunds: 0,  costCenter: "Corporate",         notes: "Guest facilitator paid $100" },
    { id: "rv12", name: "Virtual session IG promo 5/25",     date: "2026-05-25", channel: "Virtual session",  source: "Organic Instagram",campaign: "May reel",      sessionId: "",   clientId: "",  gross: 315,  stripeFee: 9.45,  studioSplit: 0,    facilitatorCost: 0,   refunds: 0,  costCenter: "Virtual sessions",  notes: "9 paid × $35 — came from reel" },
  ],
  content: [
    { id: "ct1",  name: "Maya's burnout-to-calm transformation",           category: "Client transformation",      status: "Published", platform: "Instagram", scheduledDate: "2026-06-02", datePosted: "2026-06-02", body: "3 months ago Maya could barely slow down. Last night she stayed in savasana for 10 minutes. That's the work. ✨ #breathwork #transformation", cta: "DM me", sessionId: "s1", partnerId: "", reused: false, reach: 1840, likes: 312, comments: 28, shares: 18, saves: 41, engagement: 420, leads: 3, booked: 1, revenue: 35,  notes: "Best organic reach in June" },
    { id: "ct2",  name: "What is box breathing (60s explainer)",            category: "Breathwork education",       status: "Published", platform: "TikTok",    scheduledDate: "2026-06-05", datePosted: "2026-06-05", body: "4 seconds in. Hold 4. Out 4. Hold 4. Your nervous system NEEDS this. Try it right now.", cta: "Save this", sessionId: "", partnerId: "", reused: false, reach: 8400, likes: 920, comments: 62, shares: 310, saves: 205, engagement: 1850, leads: 5, booked: 2, revenue: 70,  notes: "Went semi-viral. Repurpose to IG Reel" },
    { id: "ct3",  name: "June Thursday Reset invite (YogaSix)",              category: "Studio partner promotion",   status: "Published", platform: "Instagram", scheduledDate: "2026-06-08", datePosted: "2026-06-08", body: "Join us this Thursday at YogaSix Walnut Creek 🌿 45 min breathwork journey. Limited spots.", cta: "Link in bio", sessionId: "s2", partnerId: "sp1", reused: false, reach: 920, likes: 88, comments: 14, shares: 6, saves: 12, engagement: 210, leads: 4, booked: 3, revenue: 105, notes: "" },
    { id: "ct4",  name: "Sam Rivera testimonial clip",                       category: "Testimonials",               status: "Published", platform: "Instagram", scheduledDate: "2026-06-09", datePosted: "2026-06-09", body: "\"I didn't know I was holding so much until it started to move.\" — Sam Rivera after her first session 🙏", cta: "Book a session", sessionId: "s1", partnerId: "", reused: false, reach: 1620, likes: 242, comments: 36, shares: 24, saves: 58, engagement: 380, leads: 2, booked: 1, revenue: 35,  notes: "High save rate — strong social proof" },
    { id: "ct5",  name: "Monthly newsletter: breath + sleep connection",     category: "Breathwork education",       status: "Published", platform: "Email",     scheduledDate: "2026-06-10", datePosted: "2026-06-10", body: "How breathwork activates the parasympathetic nervous system and why that changes sleep quality...", cta: "Book a session", sessionId: "", partnerId: "", reused: false, reach: 340, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 95, leads: 1, booked: 1, revenue: 35,  notes: "Open rate 42%. Strong CTA click" },
    { id: "ct6",  name: "Why I started Simply Breathe (founder story)",      category: "Founder story",              status: "Published", platform: "Instagram", scheduledDate: "2026-06-11", datePosted: "2026-06-11", body: "The moment I realized I hadn't taken a full breath in 3 years was the moment everything changed. Here's why I do this work...", cta: "Comment below", sessionId: "", partnerId: "", reused: false, reach: 2100, likes: 418, comments: 52, shares: 30, saves: 22, engagement: 540, leads: 6, booked: 2, revenue: 70,  notes: "Highest engagement this month" },
    { id: "ct7",  name: "3 signs your nervous system needs a reset",         category: "Nervous system regulation",  status: "Published", platform: "TikTok",    scheduledDate: "2026-06-12", datePosted: "2026-06-12", body: "1. You wake up already exhausted. 2. You hold your breath when stressed. 3. You can't turn your mind off...", cta: "Save this", sessionId: "", partnerId: "", reused: false, reach: 5200, likes: 610, comments: 48, shares: 190, saves: 310, engagement: 1200, leads: 4, booked: 1, revenue: 35,  notes: "Repurpose to IG carousel" },
    { id: "ct8",  name: "Behind the scenes: how I set up a breathwork room",  category: "Behind the scenes",          status: "Draft",     platform: "Instagram", scheduledDate: "2026-06-18", datePosted: "", body: "The mats, the diffuser, the lighting — here's everything I bring to make the space feel safe...", cta: "Comment below", sessionId: "", partnerId: "sp1", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Film this Thursday before session" },
    { id: "ct9",  name: "Is breathwork safe during pregnancy? (FAQ)",        category: "FAQs",                       status: "Scheduled", platform: "Instagram", scheduledDate: "2026-06-20", datePosted: "", body: "Short answer: modified practice, yes. Here's what to know before booking...", cta: "DM me", sessionId: "", partnerId: "", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Evergreen content — schedule in advance" },
    { id: "ct10", name: "Upcoming Lotus & Pine New Moon session",             category: "Upcoming sessions",          status: "Idea",      platform: "Instagram", scheduledDate: "2026-06-22", datePosted: "", body: "", cta: "Link in bio", sessionId: "s3", partnerId: "sp5", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "Coordinate with Geoff for co-post" },
  ],
  followups: [
    { id: "f1", name: "Chris 24h check-in", clientId: "c3", stage: "Attended 1x", lastContact: "2026-06-01", futype: "24h", nextAction: "2026-06-02", outcome: "Replied - booked next session" },
    { id: "f2", name: "Maya 72h nudge", clientId: "c2", stage: "Booked", lastContact: "2026-06-09", futype: "72h", nextAction: "2026-06-12", outcome: "" },
    { id: "f3", name: "Dana referral ask", clientId: "c6", stage: "Advocate", lastContact: "2026-06-10", futype: "Referral", nextAction: "2026-06-13", outcome: "" },
    { id: "f4", name: "Jordan reactivation", clientId: "c1", stage: "Lead", lastContact: "2026-06-05", futype: "Reactivation", nextAction: "2026-06-19", outcome: "" },
    { id: "f5", name: "Priya 72h post-session", clientId: "c4", stage: "Engaged (2-3x)", lastContact: "2026-06-07", futype: "72h", nextAction: "2026-06-10", outcome: "Confirmed Friday session" },
  ],
  referrals: [
    { id: "rf1", referrerId: "c6", referredName: "Chris Okafor",       referredId: "c3", date: "2026-05-25", status: "Attended",  revenue: 35,  thankYouSent: true,  rewardGiven: false, notes: "Dana mentioned breathwork at yoga class" },
    { id: "rf2", referrerId: "c3", referredName: "Maya Chen",           referredId: "c2", date: "2026-06-02", status: "Contacted", revenue: 0,   thankYouSent: true,  rewardGiven: false, notes: "Chris shared the IG post with Maya" },
    { id: "rf3", referrerId: "c6", referredName: "Sam Rivera",          referredId: "c5", date: "2026-04-01", status: "Purchased", revenue: 540, thankYouSent: true,  rewardGiven: true,  notes: "Long-time friend of Dana — signed up same week" },
    { id: "rf4", referrerId: "c5", referredName: "Priya Nair",          referredId: "c4", date: "2026-05-08", status: "Purchased", revenue: 105, thankYouSent: true,  rewardGiven: false, notes: "Sam mentioned it to Priya at work" },
    { id: "rf5", referrerId: "c6", referredName: "Alex Kim (new lead)", referredId: "",   date: "2026-06-11", status: "Referred",  revenue: 0,   thankYouSent: false, rewardGiven: false, notes: "Dana mentioned the June workshop" },
    { id: "rf6", referrerId: "c4", referredName: "Priya's partner",     referredId: "",   date: "2026-06-07", status: "Referred",  revenue: 0,   thankYouSent: false, rewardGiven: false, notes: "Mentioned wanting partner to join at Sunday session" },
  ],
  sequences: [
    {
      id: "sq1", clientId: "c5", sessionDate: "2026-06-09",
      sessionName: "Lotus & Pine New Moon 6/9", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-09", sent: true,  sentAt: "2026-06-09", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-12", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-23", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq2", clientId: "c6", sessionDate: "2026-06-10",
      sessionName: "YogaSix Thursday Reset 6/10", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-10", sent: true,  sentAt: "2026-06-10", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-11", sent: true,  sentAt: "2026-06-11", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-16", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-24", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq3", clientId: "c4", sessionDate: "2026-06-07",
      sessionName: "Lotus & Pine Sunday Slow Down 6/7", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-08", sent: true,  sentAt: "2026-06-08", notes: "" },
        { stepId: "h72",      dueDate: "2026-06-10", sent: false, sentAt: "", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-13", sent: false, sentAt: "", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-21", sent: false, sentAt: "", notes: "" },
      ],
    },
    {
      id: "sq4", clientId: "c3", sessionDate: "2026-06-01",
      sessionName: "CorePower Berkeley Pilot 6/1", status: "active",
      steps: [
        { stepId: "same_day", dueDate: "2026-06-01", sent: true,  sentAt: "2026-06-01", notes: "" },
        { stepId: "h24",      dueDate: "2026-06-02", sent: true,  sentAt: "2026-06-02", notes: "Replied — said they felt it" },
        { stepId: "h72",      dueDate: "2026-06-04", sent: true,  sentAt: "2026-06-04", notes: "" },
        { stepId: "d5",       dueDate: "2026-06-07", sent: true,  sentAt: "2026-06-07", notes: "" },
        { stepId: "d14",      dueDate: "2026-06-15", sent: false, sentAt: "", notes: "" },
      ],
    },
  ],
  outreach: [
    { id: "ot1", name: "Empower Flow Studio",  targetType: "Studio",  contactName: "Jess Moreno",   email: "jess@empower.com",  phone: "555-0301", location: "Oakland, CA",      source: "Instagram DM",  warmth: "Hot",  priority: "High",   status: "Demo scheduled",    responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-10", nextFollowUp: "2026-06-15", revenuePotential: 2200, partnerId: "", notes: "Jess replied within 2 hours. Very excited. 40 person community." },
    { id: "ot2", name: "Nourish Wellness",     targetType: "Studio",  contactName: "Andrea Solis",  email: "andrea@nourish.com",phone: "555-0302", location: "Berkeley, CA",     source: "Referral",      warmth: "Warm", priority: "High",   status: "Responded",         responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-08", nextFollowUp: "2026-06-13", revenuePotential: 1600, partnerId: "", notes: "Referred by Alyssa at YogaSix. Warm intro. Wants to see more info." },
    { id: "ot3", name: "Peak Performance Gym", targetType: "Gym",     contactName: "Derek Wallace", email: "derek@peak.com",     phone: "555-0303", location: "Danville, CA",    source: "Cold outreach", warmth: "Cold", priority: "Medium", status: "Messaged",          responseStatus: "No response", outreachMessage: "template_gym",   lastContact: "2026-06-05", nextFollowUp: "2026-06-14", revenuePotential: 1400, partnerId: "", notes: "Sent IG DM and email. No response after 8 days." },
    { id: "ot4", name: "Mindful Motion",       targetType: "Studio",  contactName: "Priya Sharma",  email: "priya@mindful.com", phone: "555-0304", location: "Walnut Creek, CA", source: "In person",     warmth: "Warm", priority: "Medium", status: "Agreement pending",  responseStatus: "Interested",  outreachMessage: "template_intro", lastContact: "2026-06-11", nextFollowUp: "2026-06-16", revenuePotential: 1900, partnerId: "", notes: "Met at wellness fair. Agreement sent. Waiting on signature." },
    { id: "ot5", name: "Elevate Corporate",    targetType: "Corporate",contactName: "Tom Reyes",    email: "tom@elevate.com",   phone: "555-0305", location: "San Francisco, CA",source: "LinkedIn",      warmth: "Warm", priority: "High",   status: "Demo offered",      responseStatus: "Responded",   outreachMessage: "template_corp",  lastContact: "2026-06-09", nextFollowUp: "2026-06-17", revenuePotential: 3500, partnerId: "", notes: "Corporate wellness budget approved Q3. Offered lunch & learn demo." },
    { id: "ot6", name: "Zen Den Studio",       targetType: "Studio",  contactName: "Naomi Chase",   email: "naomi@zenden.com",  phone: "555-0306", location: "Concord, CA",     source: "Google",        warmth: "Cold", priority: "Low",    status: "Not contacted",     responseStatus: "Pending",     outreachMessage: "",               lastContact: "",           nextFollowUp: "2026-06-20", revenuePotential: 800,  partnerId: "", notes: "Found via Google Maps. Small studio. Low priority but nearby." },
    { id: "ot7", name: "Sacred Space",         targetType: "Studio",  contactName: "Leah Odom",     email: "leah@sacred.com",   phone: "555-0307", location: "Martinez, CA",     source: "Instagram DM",  warmth: "Cold", priority: "Low",    status: "Messaged",          responseStatus: "Ghosted",     outreachMessage: "template_intro", lastContact: "2026-05-28", nextFollowUp: "2026-06-12", revenuePotential: 1000, partnerId: "", notes: "Sent two messages. No reply. May re-engage next month." },
  ],
  testimonials: [
    { id: "tm1", name: "Dana Wolfe — Letting Go",         clientId: "c6", sessionId: "s1", status: "Published", type: "Written",    content: "I didn't expect to cry. I didn't expect to feel that much. But somewhere in the middle of that session, something I had been holding for years finally moved. I left the room feeling lighter than I had in a long time. This isn't just breathwork — it's a doorway.",                                                                                          bestQuote: "Something I had been holding for years finally moved.",          beforeSummary: "Grieving a loss, carrying unexpressed emotion, feeling stuck", afterSummary: "Deep release, emotional lightness, renewed sense of clarity",   themes: ["Emotional release","Grief processing","Emotional breakthrough"], permissionReceived: true,  useOnWebsite: true,  useOnSocial: true,  firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-02", datePublished: "2026-06-05", notes: "Used on homepage hero section" },
    { id: "tm2", name: "Sam Rivera — New Moon ceremony",  clientId: "c5", sessionId: "s3", status: "Published", type: "Written",    content: "I've tried meditation, therapy, and journaling. Nothing prepared me for how quickly breathwork cut through the noise. Within 15 minutes I was somewhere I hadn't been in years — fully present, no anxiety, just breath. I've been back four times since.",                                                                                     bestQuote: "Within 15 minutes I was somewhere I hadn't been in years.",      beforeSummary: "Chronic anxiety, difficulty being present",                  afterSummary: "Immediate calm, commitment to practice, bought 3-pack",        themes: ["Anxiety relief","Stress relief","Nervous system reset"],         permissionReceived: true,  useOnWebsite: true,  useOnSocial: true,  firstNameOnly: false, videoUrl: "",   dateReceived: "2026-04-08", datePublished: "2026-04-12", notes: "Top converting testimonial on booking page" },
    { id: "tm3", name: "Maya Chen — June 10 session",     clientId: "c2", sessionId: "s2", status: "Approved",  type: "Written",    content: "I came in burned out and skeptical. I left with a full body reset. I slept better that night than I had in months and woke up actually looking forward to my day. Whatever this is, more people need to know about it.",                                                                                                              bestQuote: "I came in burned out and skeptical. I left with a full body reset.", beforeSummary: "Burnout, poor sleep, high stress job",                    afterSummary: "Deep sleep that night, energy shift, interest in private session", themes: ["Stress relief","Improved sleep","Emotional breakthrough"],      permissionReceived: true,  useOnWebsite: true,  useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-11", datePublished: "",           notes: "Approved — schedule for social this week" },
    { id: "tm4", name: "Priya Nair — Sunday Slow Down",   clientId: "c4", sessionId: "s3", status: "Received",  type: "Written",    content: "I came because Sam wouldn't stop talking about it. I stayed because something in me woke up. I've never cried and laughed in the same breath before. My body knew things my mind had forgotten.",                                                                                                                          bestQuote: "My body knew things my mind had forgotten.",                      beforeSummary: "Skeptical, came via referral",                               afterSummary: "Emotional awakening, high referral potential",                  themes: ["Emotional release","Spiritual growth","Mental clarity"],        permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "2026-06-08", datePublished: "",           notes: "Need to confirm permission before using" },
    { id: "tm5", name: "Chris Okafor — first session",    clientId: "c3", sessionId: "s1", status: "Breakthrough noted", type: "Written", content: "",                                                                                                                                                                                                                                                                                                               bestQuote: "",                                                               beforeSummary: "First-timer, strong nervous system response during session",  afterSummary: "Hasn't been asked yet — testimonial request overdue",          themes: ["Stress relief","Nervous system reset"],                          permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "",   dateReceived: "",           datePublished: "",           notes: "Breakthrough observed 6/1. Request not yet sent." },
  ],
  templates: [
    {
      id: "tpl1", name: "Studio outreach — intro",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 4,
      subject: "Breathwork for {{studioName}} — a revenue partnership",
      body: `Hi {{contactName}},

I'm {{yourName}}, founder of Simply Breathe. I help wellness studios add high-engagement breathwork experiences that their community loves — and that generate meaningful additional revenue for the studio.

Here's how it works: I bring the session, the music, the facilitation, and the follow-up. You provide the space and promote to your list. We split the revenue. No risk, no cost to you.

Studios like {{referenceStudio}} have seen {{avgAttendance}} attendees per session and strong re-booking rates.

Would you be open to a 15-minute call to see if this is a fit for {{studioName}}?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{yourName}}, {{referenceStudio}}, {{avgAttendance}}",
      notes: "Use for cold and warm intro. Personalize with referenceStudio name for warm intros.",
    },
    {
      id: "tpl2", name: "Studio follow-up — no response",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 2,
      subject: "Following up — Simply Breathe × {{studioName}}",
      body: `Hi {{contactName}},

I wanted to follow up on my message from {{lastContactDate}}. I completely understand life gets busy.

I'd love just 15 minutes to show you what the experience has looked like at studios similar to yours. No obligation — just a conversation.

If timing isn't right right now, I'm happy to circle back in a few weeks. Just let me know.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{lastContactDate}}, {{yourName}}",
      notes: "Send 5–7 days after initial outreach with no response.",
    },
    {
      id: "tpl3", name: "Demo invitation",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 3,
      subject: "Let me bring the experience to {{studioName}}",
      body: `Hi {{contactName}},

The best way to understand what Simply Breathe is about is to feel it.

I'd love to offer a complimentary 30-minute breathwork experience for you and a small group at {{studioName}} — no commitment required. I'll handle everything: music, facilitation, and a brief debrief afterward.

It's the fastest way to know if this resonates with your community.

Are you open to {{proposedDate}}?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{proposedDate}}, {{yourName}}",
      notes: "Best used after initial interest shown. Keep it low-commitment.",
    },
    {
      id: "tpl4", name: "Pilot proposal",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 1,
      subject: "4-week breathwork pilot for {{studioName}} — proposal",
      body: `Hi {{contactName}},

Thank you for the conversation last week — I left genuinely excited about what this could be for {{studioName}} and your community.

I'd like to propose a 4-week pilot:

• {{sessionsPerMonth}} sessions per month
• Revenue split: {{revSplit}}
• Ticket price: {{ticketPrice}} per person
• Minimum attendance: {{minAttendance}} to cover costs
• I handle: facilitation, music, setup, follow-up emails
• You handle: space, promotion to your list, social posts

I've attached a one-page overview. I'm also happy to jump on a call to walk through any questions.

Looking forward to building something great together.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{sessionsPerMonth}}, {{revSplit}}, {{ticketPrice}}, {{minAttendance}}, {{yourName}}",
      notes: "Personalize numbers from the partner record. Attach one-pager PDF.",
    },
    {
      id: "tpl5", name: "Agreement follow-up",
      category: "Studio Sales", channel: "Email", linkedTo: "partners", usageCount: 0,
      subject: "Quick check-in on our agreement — {{studioName}}",
      body: `Hi {{contactName}},

I wanted to circle back on the partnership agreement I sent over on {{sentDate}}.

Is there anything you'd like to discuss, clarify, or adjust before we move forward? I'm happy to get on a quick call if that's easier.

Once we have the agreement signed, I can get the booking page and QR code set up within a few days so we can start promoting.

Looking forward to it.

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{studioName}}, {{sentDate}}, {{yourName}}",
      notes: "Send 4–5 days after agreement sent with no response.",
    },
    {
      id: "tpl6", name: "Event reminder",
      category: "Operations", channel: "Email", linkedTo: "sessions", usageCount: 7,
      subject: "Your session is coming up — {{sessionName}}",
      body: `Hi {{clientName}},

Just a reminder that {{sessionName}} is happening:

📅 {{sessionDate}}
🕐 {{sessionTime}}
📍 {{location}}

A few things to know:
• Arrive 5–10 minutes early so we can get settled
• Wear comfortable clothing you can breathe in
• Bring a water bottle
• No food 2 hours before if possible

The waiver link (if needed): {{waiverLink}}

I can't wait to hold space for you. See you soon. 🌿

Warm,
{{yourName}}`,
      variables: "{{clientName}}, {{sessionName}}, {{sessionDate}}, {{sessionTime}}, {{location}}, {{waiverLink}}, {{yourName}}",
      notes: "Send 24–48 hours before the session.",
    },
    {
      id: "tpl7", name: "Thank-you after session",
      category: "Post-Session", channel: "SMS", linkedTo: "clients", usageCount: 12,
      subject: "",
      body: `Hi {{clientName}} 💙

Thank you so much for being in the room today. What you did took courage — and I hope you can feel the shift.

Take it slow tonight. Rest, hydrate, and let your body integrate. If anything comes up — emotions, memories, questions — that's normal and beautiful.

I'm here if you need anything.

— {{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send within 2 hours of session ending. Keep it warm and brief.",
    },
    {
      id: "tpl8", name: "24-hour check-in",
      category: "Post-Session", channel: "SMS", linkedTo: "clients", usageCount: 9,
      subject: "",
      body: `Hi {{clientName}} 🌿

Checking in from yesterday. How are you feeling today?

Sometimes the integration happens slowly — sleep, emotions, moments of unexpected clarity. All of it is part of the process.

Anything you want to share or ask? I'm here.

— {{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send ~24 hours after session. Creates the opening for deeper conversation.",
    },
    {
      id: "tpl9", name: "72-hour offer follow-up",
      category: "Sales & Offers", channel: "Email", linkedTo: "clients", usageCount: 6,
      subject: "Continuing the work — an invitation for you",
      body: `Hi {{clientName}},

I hope you've had a chance to settle into what came up in our last session. The shift you experienced doesn't have to be a one-time thing.

For those who feel called to go deeper, I'm offering {{offerDetails}} — which gives us the space to do more sustained, meaningful work together.

If that resonates, here's how to move forward: {{bookingLink}}

No pressure at all. But if something is stirring in you, this is the next step.

With care,
{{yourName}}`,
      variables: "{{clientName}}, {{offerDetails}}, {{bookingLink}}, {{yourName}}",
      notes: "Send 48–72 hours after session. Match offer to client's experience.",
    },
    {
      id: "tpl10", name: "Testimonial request",
      category: "Engagement", channel: "Email", linkedTo: "clients", usageCount: 5,
      subject: "Would you share your experience?",
      body: `Hi {{clientName}},

It means a lot that you showed up for this work. What you experienced is real — and it matters.

If you're open to it, I'd love to hear about your experience in a few sentences. Even just: what shifted, what you noticed, or what you'd tell someone considering their first session.

Your words could be exactly what someone else needs to hear to take the first step.

You can reply directly to this email — I'll handle the rest.

Thank you for trusting the process. 🙏

With gratitude,
{{yourName}}`,
      variables: "{{clientName}}, {{yourName}}",
      notes: "Send 5–7 days after session. Best results when sent after breakthrough sessions.",
    },
    {
      id: "tpl11", name: "Referral request",
      category: "Engagement", channel: "Email", linkedTo: "clients", usageCount: 3,
      subject: "Know someone who could use this?",
      body: `Hi {{clientName}},

Thank you for continuing to show up. You've been on such a beautiful journey and I'm so grateful for the trust you've placed in this work.

If there's someone in your life who might benefit — a friend who's burned out, anxious, stuck, or just ready for something to shift — I'd be honored if you'd share my info with them.

Here's a simple way to do it: just forward them this email or send them my booking link: {{bookingLink}}

As a thank-you for any referral who books, {{referralReward}}.

You've already changed your own life. Imagine what it could mean to help someone else take the first step.

With so much appreciation,
{{yourName}}`,
      variables: "{{clientName}}, {{bookingLink}}, {{referralReward}}, {{yourName}}",
      notes: "Best sent to Advocates and clients with 3+ sessions attended.",
    },
    {
      id: "tpl12", name: "Rebooking invitation",
      category: "Sales & Offers", channel: "SMS", linkedTo: "clients", usageCount: 8,
      subject: "",
      body: `Hi {{clientName}} 🌿

I'd love to see you again. {{nextSessionDetails}} — would you like to grab a spot?

Spaces fill fast. Here's the link: {{bookingLink}}

Hope to breathe with you soon. 💙
— {{yourName}}`,
      variables: "{{clientName}}, {{nextSessionDetails}}, {{bookingLink}}, {{yourName}}",
      notes: "Send 7–10 days after last session if no next session is booked.",
    },
    {
      id: "tpl13", name: "Private session offer",
      category: "Sales & Offers", channel: "Email", linkedTo: "clients", usageCount: 2,
      subject: "A personal invitation — 1:1 breathwork with {{yourName}}",
      body: `Hi {{clientName}},

I've been thinking about your journey since our last session. What came up for you is important — and I believe there's more depth available if we create the space for it.

I'd like to invite you to a private 1:1 breathwork session. Unlike a group setting, we can tailor the entire experience to exactly what you're carrying and where you want to go.

Private sessions are {{privateSessionPrice}} and run {{privateSessionLength}} minutes. I only hold a limited number each month.

If this feels right, reply to this email or book directly here: {{bookingLink}}

With care,
{{yourName}}`,
      variables: "{{clientName}}, {{yourName}}, {{privateSessionPrice}}, {{privateSessionLength}}, {{bookingLink}}",
      notes: "Offer to clients who've had breakthroughs or attended 2+ group sessions.",
    },
    {
      id: "tpl14", name: "Corporate inquiry response",
      category: "Studio Outreach", channel: "Email", linkedTo: "partners", usageCount: 1,
      subject: "Re: Breathwork for {{companyName}} — let's talk",
      body: `Hi {{contactName}},

Thank you so much for reaching out. Corporate wellness is something I'm genuinely passionate about, and I'd love to explore how breathwork could support your team at {{companyName}}.

Here's what I typically offer for corporate groups:

• 60-minute breathwork experience for teams of 10–50
• Options: lunch & learn, offsite, quarterly reset, or recurring monthly
• Fully facilitated — I bring everything needed
• Focus areas: stress management, nervous system regulation, team presence, creative reset

Investment starts at {{corporateRate}} for groups up to {{groupSize}}.

I'd love to set up a 20-minute call to learn more about your team's needs. Would {{proposedDate}} work?

Warm,
{{yourName}}`,
      variables: "{{contactName}}, {{companyName}}, {{corporateRate}}, {{groupSize}}, {{proposedDate}}, {{yourName}}",
      notes: "Respond within 24 hours. Always offer a specific call time.",
    },
  ],
  expenses: [
    { id: "exp1",  date: "2026-06-01", vendor: "Amazon",           description: "Wired headsets (x2)",                  amount: 189.99, category: "Equipment & Supplies",      paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "", linkedPartner: "", notes: "Primary + backup headset for sessions" },
    { id: "exp2",  date: "2026-06-01", vendor: "Mindbody",         description: "Booking software monthly subscription", amount: 129.00, category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
    { id: "exp3",  date: "2026-06-03", vendor: "Meta Ads",         description: "Instagram session promotion",           amount: 75.00,  category: "Marketing & Advertising",  paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s1", linkedPartner: "", notes: "Letting Go & Rebirth promo — 3 bookings attributed" },
    { id: "exp4",  date: "2026-06-05", vendor: "Spotify for Artists", description: "Music licensing — monthly",          amount: 9.99,   category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
    { id: "exp5",  date: "2026-06-08", vendor: "Whole Foods",      description: "Water, tissues, mint tea — session supplies", amount: 34.50, category: "Equipment & Supplies", paymentMethod: "Credit Card", taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s2", linkedPartner: "sp1", notes: "YogaSix session supplies" },
    { id: "exp6",  date: "2026-06-10", vendor: "Mileage",          description: "Driving to YogaSix Walnut Creek (22mi x2)", amount: 27.06, category: "Travel & Transport",    paymentMethod: "Cash",        taxDeductible: true,  recurring: false, recurringFreq: "One-time",  linkedSession: "s2", linkedPartner: "sp1", notes: "IRS rate $0.67/mi" },
    { id: "exp7",  date: "2026-06-11", vendor: "Canva Pro",        description: "Design tool — annual plan (monthly equiv)", amount: 12.99, category: "Software & Subscriptions", paymentMethod: "Credit Card", taxDeductible: true, recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "Flyers, social graphics" },
    { id: "exp8",  date: "2026-05-15", vendor: "David Elliott",    description: "Advanced breathwork certification",     amount: 497.00, category: "Education & Training",     paymentMethod: "Bank Transfer", taxDeductible: true, recurring: false, recurringFreq: "One-time", linkedSession: "", linkedPartner: "", notes: "CPD hours — annual" },
    { id: "exp9",  date: "2026-05-20", vendor: "Next Insurance",   description: "General liability — monthly",           amount: 46.00,  category: "Insurance",                paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "GL + professional indemnity bundle" },
    { id: "exp10", date: "2026-05-01", vendor: "Squarespace",      description: "Website hosting — annual (monthly equiv)", amount: 19.17, category: "Administrative",         paymentMethod: "Credit Card", taxDeductible: true,  recurring: true,  recurringFreq: "Monthly",   linkedSession: "", linkedPartner: "", notes: "" },
  ],
  registrations: [],
};

/* ---------- Helpers ---------- */
const STORE_KEY     = "simplybreathe:data:v4";           // legacy (unencrypted)
const STORE_KEY_ENC = "simplybreathe:data:v5:enc";       // encrypted storage
const SEC_META_KEY  = "sb:security:v1";                  // { users: [...] }

// Unified storage — uses window.storage (Cursor canvas) when available, falls back to localStorage
const store = {
  async get(key) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        return window.storage.get(key);
      }
      const val = localStorage.getItem(key);
      return { value: val };
    } catch { return { value: null }; }
  },
  async set(key, value) {
    try {
      if (typeof window !== "undefined" && window.storage) {
        return window.storage.set(key, value);
      }
      localStorage.setItem(key, value);
    } catch { /* storage unavailable */ }
  },
  available() { return true; }, // store always works via localStorage fallback
};

/* ── SECURITY UTILITIES ── */
const Sec = {
  async hashPin(pin) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  },
  newSalt() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  },
  PBKDF2_ITERATIONS: 600_000,   // OWASP 2024 recommendation
  async deriveKey(pin, saltB64, iterations) {
    const iters = iterations ?? Sec.PBKDF2_ITERATIONS;
    const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0));
    const mat  = await crypto.subtle.importKey(
      "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: iters, hash: "SHA-256" },
      mat,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },
  async encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key,
      new TextEncoder().encode(JSON.stringify(data))
    );
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv); out.set(new Uint8Array(ct), 12);
    // Use loop instead of spread to avoid stack overflow on large payloads
    let str = "";
    for (let i = 0; i < out.length; i++) str += String.fromCharCode(out[i]);
    return btoa(str);
  },
  async decrypt(b64, key) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const pt  = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12)
    );
    return JSON.parse(new TextDecoder().decode(pt));
  },
  // ── Master key (envelope encryption for multi-user) ──
  async generateMasterKeyB64() {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
    const raw = await crypto.subtle.exportKey("raw", key);
    return btoa(String.fromCharCode(...new Uint8Array(raw)));
  },
  async importMasterKey(b64) {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  },
  async wrapKeyForUser(masterKeyB64, pin, salt, iterations) {
    const wrapKey = await Sec.deriveKey(pin, salt, iterations);
    return Sec.encrypt(masterKeyB64, wrapKey);
  },
  async unwrapKeyForUser(wrappedB64, pin, salt, iterations) {
    const wrapKey = await Sec.deriveKey(pin, salt, iterations);
    const mkB64   = await Sec.decrypt(wrappedB64, wrapKey);
    return { raw: mkB64, key: await Sec.importMasterKey(mkB64) };
  },
  sanitize(val) {
    if (typeof val !== "string") return val;
    const t = val.trim();
    const clean = /^[=+\-@|%]/.test(t) ? "'" + t : t;  // neutralise CSV formula injection
    return clean.replace(/<[^>]*>/g, "");                // strip HTML tags
  },
  validate(d) {
    return d && typeof d === "object" &&
      ["clients", "partners", "sessions", "offers"].every(k => Array.isArray(d[k]));
  },
};

/* ── USER MANAGEMENT ── */
const USER_ROLES = ["Owner", "Admin", "Editor", "Viewer"];
const USER_ROLE_COLOR = { Owner: "#4A8C6F", Admin: "#2E6FB0", Editor: C.brand, Viewer: C.ink3 };
const USER_COLORS = ["#2E6FB0","#6B5CE7","#D9892B","#4A8C6F",C.brand,"#C0392B","#8E44AD","#16A085"];
const ROLE_PERMISSIONS = {
  Owner:  { view: true,  edit: true,  delete: true,  manage: true  },
  Admin:  { view: true,  edit: true,  delete: true,  manage: false },
  Editor: { view: true,  edit: true,  delete: false, manage: false },
  Viewer: { view: true,  edit: false, delete: false, manage: false },
};
const uid = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtDate(iso, withYear) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${MONTHS[m - 1]} ${d}${withYear ? ", " + y : ""}`;
}
const money = (n) =>
  n === "" || n == null || isNaN(n) ? "—" :
    "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const pct = (n) => (n === "" || n == null || isNaN(n) ? "—" : Math.round(Number(n) * 100) + "%");
const onOrBefore = (iso, t) => !!iso && iso <= t;
const sameMonth = (iso, ref) => !!iso && iso.slice(0, 7) === ref.slice(0, 7);
const num = (v) => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? "" : n; };
const norm = (s) => String(s || "").trim().toLowerCase();

/* ============================================================ */
/* ── FIRST-RUN SETUP SCREEN ── */
function FirstRunSetup({ onSetup, error }) {
  const [name, setName]         = useState("");
  const [pin, setPin]           = useState("");
  const [confirm, setConfirm]   = useState("");
  const [msg, setMsg]           = useState("");
  const [busy, setBusy]         = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim())        { setMsg("Please enter your name."); return; }
    if (pin.length < 6)      { setMsg("PIN must be at least 6 characters."); return; }
    if (pin !== confirm)     { setMsg("PINs don't match."); return; }
    setBusy(true);
    setMsg("");
    await onSetup(name, pin);
    setBusy(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.body }}>
      <div style={{ background: C.surface, borderRadius: 22, padding: "40px 40px 36px", width: 420, maxWidth: "92vw",
        boxShadow: `0 24px 80px ${hexA(C.brandDeep, 0.18)}`, textAlign: "center" }}>
        <img src={LOGO} alt="Simply Breathe" style={{ height: 64, marginBottom: 20 }} />
        <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 6 }}>Welcome to Simply Breathe OS</div>
        <div style={{ fontSize: 14, color: C.ink3, marginBottom: 28, lineHeight: 1.6 }}>
          Let's set up your owner account. You'll use this name and PIN every time you log in.
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Your Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sarah Johnson"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Create PIN <span style={{ color: C.ink3, fontWeight: 400 }}>(min. 6 characters)</span></label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Choose a strong PIN"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 5 }}>Confirm PIN</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter your PIN"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: `1.5px solid ${C.line}`, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: FONT.body }} />
          </div>
          {(msg || error) && <div style={{ fontSize: 13, color: "#C0573F", fontWeight: 600 }}>{msg || error}</div>}
          <button type="submit" disabled={busy}
            style={{ marginTop: 4, padding: "12px", borderRadius: 10, border: "none", background: C.brand, color: "#fff",
              fontSize: 15, fontWeight: 700, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.7 : 1, fontFamily: FONT.body }}>
            {busy ? "Setting up…" : "Create Account & Enter"}
          </button>
        </form>
        <div style={{ marginTop: 20, fontSize: 12, color: C.ink3, lineHeight: 1.6 }}>
          Your PIN encrypts all data stored in this browser. Store it somewhere safe — it cannot be recovered if lost.
        </div>
      </div>
    </div>
  );
}

/* ============================================================ */
/* ── LOCK SCREEN ── */
function LockScreen({ onUnlock, error, initialising, users }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin]   = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  // Detect legacy v1 account (unsalted SHA-256) needing upgrade
  const needsV1Upgrade = !initialising && users.some(u => u.id === "v1_migration");

  // Auto-select if only one user
  useEffect(() => {
    if (!initialising && users.length === 1) setSelectedUser(users[0]);
  }, [initialising, users]);

  const submit = async (e) => {
    e.preventDefault();
    if (!pin.trim() || busy || !selectedUser) return;
    setBusy(true);
    await onUnlock(selectedUser.id, pin);
    setBusy(false);
    setPin("");
  };

  const initials = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{
      minHeight: "100vh", background: C.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: C.surface, border: `1px solid ${C.line}`, borderRadius: 20,
        padding: "28px 40px 36px", width: "100%", maxWidth: 400, textAlign: "center",
        boxShadow: "0 8px 40px rgba(22,33,58,0.10)",
      }}>
        <div style={{ width: 162, height: 130, margin: "0 auto 0", display: "flex", alignItems: "flex-end", justifyContent: "center", overflow: "hidden" }}>
          <img src="/sb-heart-wave.png" alt="Simply Breathe" style={{ width: 162, height: 162, objectFit: "contain", marginBottom: -16 }} />
        </div>
        <h1 style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 700, color: C.ink, margin: "0 0 4px" }}>
          Simply Breathe OS
        </h1>
        <p style={{ fontSize: 13, color: C.ink3, margin: needsV1Upgrade ? "0 0 12px" : "0 0 28px" }}>
          {initialising ? "Loading…" : selectedUser ? `Welcome back, ${selectedUser.name.split(" ")[0]}` : "Who's accessing today?"}
        </p>
        {needsV1Upgrade && (
          <div style={{
            margin: "0 0 18px", padding: "10px 14px", borderRadius: 10,
            background: "#fffbe6", border: "1.5px solid #f5c542",
            fontSize: 12, color: "#7a5c00", textAlign: "left", lineHeight: 1.5,
          }}>
            <strong>Security upgrade required</strong><br />
            Your account uses an older PIN format. Please log in to automatically upgrade to enhanced security (PBKDF2).
          </div>
        )}

        {initialising ? (
          <div style={{ fontSize: 13, color: C.ink3, padding: "20px 0" }}>Initialising security…</div>
        ) : !selectedUser ? (
          /* ── User tile grid ── */
          <div style={{ display: "grid", gridTemplateColumns: users.length > 2 ? "1fr 1fr" : "1fr", gap: 10 }}>
            {users.map(u => (
              <button key={u.id} onClick={() => setSelectedUser(u)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                border: `1.5px solid ${C.line}`, borderRadius: 12, cursor: "pointer",
                background: C.surfaceAlt, transition: "all .12s", textAlign: "left",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = u.color || C.brand; e.currentTarget.style.background = hexA(u.color || C.brand, 0.06); }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.line; e.currentTarget.style.background = C.surfaceAlt; }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.color || C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                  {u.avatar
                    ? <img src={u.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : initials(u.name)
                  }
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: USER_ROLE_COLOR[u.role] || C.ink3, fontWeight: 600 }}>{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* ── PIN entry ── */
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {users.length > 1 && (
              <button type="button" onClick={() => { setSelectedUser(null); setPin(""); setPinError?.(""); }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  border: `1px solid ${C.line}`, borderRadius: 10, cursor: "pointer",
                  background: C.surfaceAlt, width: "100%", marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: selectedUser.color || C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff", overflow: "hidden", position: "relative" }}>
                  {selectedUser.avatar
                    ? <img src={selectedUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : initials(selectedUser.name)
                  }
                </div>
                <div style={{ textAlign: "left", flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.ink }}>{selectedUser.name}</div>
                  <div style={{ fontSize: 11, color: C.ink3 }}>Change user ↩</div>
                </div>
              </button>
            )}
            <div style={{ position: "relative" }}>
              <input type={show ? "text" : "password"} value={pin} onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN" autoFocus style={{
                  width: "100%", padding: "13px 44px 13px 16px",
                  border: `1.5px solid ${error ? "#C0392B" : C.line}`,
                  borderRadius: 10, fontSize: 16, outline: "none",
                  fontFamily: "monospace", letterSpacing: show ? ".05em" : ".3em",
                  color: C.ink, background: C.surface, boxSizing: "border-box",
                }}
                onFocus={e => e.target.style.borderColor = C.brand}
                onBlur={e => e.target.style.borderColor = error ? "#C0392B" : C.line}
              />
              <button type="button" onClick={() => setShow(s => !s)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", fontSize: 11, color: C.ink3, fontWeight: 600,
              }}>{show ? "HIDE" : "SHOW"}</button>
            </div>
            {error && (
              <div style={{ fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07),
                borderRadius: 8, padding: "8px 12px", textAlign: "left", display: "flex", gap: 7, alignItems: "center" }}>
                <AlertCircle size={13} color="#C0392B" /> {error}
              </div>
            )}
            <button type="submit" disabled={busy || !pin.trim()} style={{
              padding: "13px", background: busy || !pin.trim() ? C.line : selectedUser.color || C.brand,
              color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: busy || !pin.trim() ? "not-allowed" : "pointer", transition: "background .15s",
            }}>{busy ? "Unlocking…" : "Unlock"}</button>
          </form>
        )}
        <p style={{ fontSize: 11, color: C.ink3, marginTop: 22, lineHeight: 1.6 }}>
          🔒 Data encrypted with AES-256-GCM
        </p>
      </div>
    </div>
  );
}

const DISMISSED_ALERTS_KEY = "sb:dismissed-alerts:v1";

export default function App() {
  const [data, setData] = useState(SEED);
  const [section, setSection] = useState("today");
  const [view, setView] = useState(0);
  const [open, setOpen] = useState(null);   // record drawer { db, record }
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAlerts,  setShowAlerts]  = useState(false);
  const [crmSettings, setCrmSettings] = useState(() => loadCrmSettings());
  const [dismissedAlerts, setDismissedAlerts] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [confirm, setConfirm] = useState(null); // { message, onOk, okLabel?, danger? }
  const [saved, setSaved] = useState("idle"); // idle | saving | saved
  const [calendlyStatus, setCalendlyStatus] = useState(null); // null | { pending: n } | { syncing: true } | { synced: n, at: time }
  const [lastCalendlyReceived, setLastCalendlyReceived] = useState(null); // { count, atFull } — only set when bookings > 0
  const loaded = useRef(false);
  const today = todayISO();

  /* ── Auth state ── */
  const [locked,       setLocked]      = useState(true);
  const [needsSetup,   setNeedsSetup]  = useState(false); // true on first-ever launch
  const [cryptoKey,    setCryptoKey]   = useState(null);
  const [masterKeyRaw, setMasterKeyRaw] = useState(null); // raw b64 for user mgmt
  const [currentUser,  setCurrentUser]  = useState(null); // logged-in user object
  const [pinError,     setPinError]    = useState("");
  const PIN_LOCKOUT_KEY = "sb:pin-lockout:v1";
  const [pinAttempts,  setPinAttempts]  = useState(() => {
    // localStorage: persists across tabs and page refreshes (cross-tab lockout enforcement).
    // Stale entries (expired lockout, no pending attempts) are pruned on read.
    try {
      const raw = JSON.parse(localStorage.getItem("sb:pin-lockout:v1") || "{}");
      const now = Date.now();
      return Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v.count > 0 || v.lockedUntil > now)
      );
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem(PIN_LOCKOUT_KEY, JSON.stringify(pinAttempts)); } catch {}
  }, [pinAttempts]);
  const [initialising, setInitialising] = useState(true);
  const [secUsers,     setSecUsers]    = useState([]);    // loaded from SEC_META_KEY

  /* ── Security initialisation (on mount) ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const sec = await store.get(SEC_META_KEY);
        if (sec?.value) {
          const parsed = JSON.parse(sec.value);
          // v2 multi-user format
          if (parsed.version === 2 && Array.isArray(parsed.users)) {
            if (alive) setSecUsers(parsed.users.filter(u => u.active !== false));
          } else {
            // v1 single-user format — show a placeholder tile so the screen is interactive
            // handleUnlock will auto-migrate to v2 on successful PIN entry
            if (alive) setSecUsers([{
              id: "v1_migration", name: "Admin", role: "Owner",
              permissions: ROLE_PERMISSIONS.Owner, active: true, color: USER_COLORS[0],
            }]);
          }
        } else {
          // First ever run — prompt user to create their account
          if (alive) setNeedsSetup(true);
        }
      } catch (_) { /* storage unavailable */ }
      finally {
        if (alive) {
          // Only add fallback tile if not in first-run setup mode
          setSecUsers(prev => {
            if (prev.length > 0) return prev;
            return [{ id: "v1_migration", name: "Admin", role: "Owner",
              permissions: ROLE_PERMISSIONS.Owner, active: true, color: USER_COLORS[0] }];
          });
          setInitialising(false);
        }
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── PIN unlock handler ── */
  const PIN_MAX_ATTEMPTS = 5;
  const PIN_LOCKOUT_MS   = 5 * 60 * 1000; // 5 minutes

  const handleUnlock = async (userId, pin) => {
    setPinError("");

    // ── Brute-force lockout check ──
    const now = Date.now();
    const rec = pinAttempts[userId] || { count: 0, lockedUntil: 0 };
    if (rec.lockedUntil > now) {
      const remaining = Math.ceil((rec.lockedUntil - now) / 60000);
      setPinError(`Too many failed attempts. Try again in ${remaining} minute${remaining !== 1 ? "s" : ""}.`);
      return;
    }
    try {
      const secRaw = await store.get(SEC_META_KEY);
      if (!secRaw?.value) throw new Error("No security config");
      const sec = JSON.parse(secRaw.value);

      // ── Migrate v1 → v2 ──
      if (!sec.version || sec.version < 2) {
        const hash = await Sec.hashPin(pin);
        if (hash !== sec.pinHash) {
          const newCount = (rec.count || 0) + 1;
          const lockedUntil = newCount >= PIN_MAX_ATTEMPTS ? Date.now() + PIN_LOCKOUT_MS : 0;
          setPinAttempts(p => ({ ...p, [userId]: { count: newCount, lockedUntil } }));
          setPinError(lockedUntil ? `Too many failed attempts. Try again in 5 minutes.` : `Incorrect PIN. ${PIN_MAX_ATTEMPTS - newCount} attempt${PIN_MAX_ATTEMPTS - newCount !== 1 ? "s" : ""} remaining.`);
          return;
        }
        // Generate master key and re-wrap with this PIN
        const masterKeyB64 = await Sec.generateMasterKeyB64();
        const pinSalt      = sec.salt;
        const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyB64, pin, pinSalt, Sec.PBKDF2_ITERATIONS);
        const owner = {
          id: "u_owner", name: "Admin", role: "Owner",
          // pinHash intentionally omitted — v2 verification uses PBKDF2 unwrap only
          pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
          permissions: ROLE_PERMISSIONS.Owner,
          active: true, color: USER_COLORS[0],
          createdAt: todayISO(), lastLogin: todayISO(),
        };
        const newSec = { version: 2, users: [owner] };
        await store.set(SEC_META_KEY, JSON.stringify(newSec));
        setSecUsers([owner]);
        const masterKey = await Sec.importMasterKey(masterKeyB64);
        // Migrate encrypted data: re-encrypt with new master key
        const encRaw = await store.get(STORE_KEY_ENC);
        if (encRaw?.value) {
          const oldKey = await Sec.deriveKey(pin, sec.salt);
          try {
            const dec = await Sec.decrypt(encRaw.value, oldKey);
            const reenc = await Sec.encrypt(dec, masterKey);
            await store.set(STORE_KEY_ENC, reenc);
            if (Sec.validate(dec)) {
              setData(dec);
              if (dec._settings && typeof dec._settings === "object") {
                const s = parseCrmSettings(dec._settings);
                _crmSettings = s;
                setCrmSettings(s);
                try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(s)); } catch {}
              }
            }
          } catch (_) {}
        }
        setMasterKeyRaw(masterKeyB64);
        setCryptoKey(masterKey);
        setCurrentUser(owner);
        loaded.current = true;
        setLocked(false);
        setSection("today"); setView(0);
        return;
      }

      // ── v2 unlock ──
      const user = sec.users.find(u => u.id === userId && u.active !== false);
      if (!user) throw new Error("User not found");

      // Verify PIN via PBKDF2 unwrap — use stored iteration count (may be legacy 100k)
      const storedIterations = user.pbkdf2Iterations ?? 100_000;
      let mkB64, masterKey;
      try {
        const result = await Sec.unwrapKeyForUser(user.wrappedMasterKey, pin, user.pinSalt, storedIterations);
        mkB64 = result.raw;
        masterKey = result.key;
      } catch (_) {
        const newCount = (rec.count || 0) + 1;
        const lockedUntil = newCount >= PIN_MAX_ATTEMPTS ? Date.now() + PIN_LOCKOUT_MS : 0;
        setPinAttempts(p => ({ ...p, [userId]: { count: newCount, lockedUntil } }));
        setPinError(lockedUntil ? `Too many failed attempts. Try again in 5 minutes.` : `Incorrect PIN. ${PIN_MAX_ATTEMPTS - newCount} attempt${PIN_MAX_ATTEMPTS - newCount !== 1 ? "s" : ""} remaining.`);
        return;
      }

      // Load data
      const encRaw = await store.get(STORE_KEY_ENC);
      if (encRaw?.value) {
        try {
          const dec = await Sec.decrypt(encRaw.value, masterKey);
          if (Sec.validate(dec)) {
            setData(dec);
            // Restore CRM settings from encrypted store — preferred over unencrypted localStorage cache
            if (dec._settings && typeof dec._settings === "object") {
              const s = parseCrmSettings(dec._settings);
              _crmSettings = s;
              setCrmSettings(s);
              try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(s)); } catch {}
            }
          } else {
            setPinError("Data integrity check failed. Please restore from a JSON backup.");
            return;
          }
        } catch (_) {
          setPinError("Data could not be decrypted. Please try again, or restore from a JSON backup.");
          return;
        }
      } else {
        // Check for legacy v4 unencrypted data
        const legacyRaw = await store.get(STORE_KEY);
        if (legacyRaw?.value) {
          try { const l = JSON.parse(legacyRaw.value); if (Sec.validate(l)) setData(l); } catch (_) {}
        }
      }

      // Silently upgrade PBKDF2 iterations if below current target (600k)
      let upgradedWrappedKey = user.wrappedMasterKey;
      let upgradedSalt       = user.pinSalt;
      if (storedIterations < Sec.PBKDF2_ITERATIONS) {
        try {
          upgradedSalt       = Sec.newSalt();
          upgradedWrappedKey = await Sec.wrapKeyForUser(mkB64, pin, upgradedSalt, Sec.PBKDF2_ITERATIONS);
        } catch (_) {
          // Non-fatal — keep old values if upgrade fails
          upgradedWrappedKey = user.wrappedMasterKey;
          upgradedSalt       = user.pinSalt;
        }
      }

      // Update lastLogin, scrub legacy pinHash, persist iteration count
      const updatedUsers = sec.users.map(u => {
        const { pinHash: _dropped, ...rest } = u; // remove legacy SHA-256 hash
        if (u.id === userId) {
          return {
            ...rest,
            lastLogin: todayISO(),
            pinSalt:           upgradedSalt,
            wrappedMasterKey:  upgradedWrappedKey,
            pbkdf2Iterations:  Sec.PBKDF2_ITERATIONS,
          };
        }
        return rest;
      });
      await store.set(SEC_META_KEY, JSON.stringify({ ...sec, users: updatedUsers }));
      setSecUsers(updatedUsers.filter(u => u.active !== false));

      setMasterKeyRaw(mkB64);
      setCryptoKey(masterKey);
      setCurrentUser(updatedUsers.find(u => u.id === userId) ?? user);
      setPinAttempts(p => { const n = { ...p }; delete n[userId]; return n; }); // reset on success
      // Clean up legacy unencrypted storage
      try { localStorage.removeItem(STORE_KEY); } catch (_) {}
      loaded.current = true;
      setLocked(false);
      setSection("today"); setView(0);
    } catch (e) {
      if (!e.message?.includes("PIN")) setPinError("Something went wrong. Please try again.");
    }
  };

  /* ── First-launch owner account setup ── */
  const handleSetupOwner = async (name, pin) => {
    try {
      // Guard: if encrypted data already exists, refuse to overwrite without a full page reload
      const existingEnc = await store.get(STORE_KEY_ENC);
      if (existingEnc?.value) {
        setPinError("Encrypted data already exists. Reload the page and log in — or restore from a JSON backup before setting up a new account.");
        return;
      }
      const pinSalt      = Sec.newSalt();
      const masterKeyB64 = await Sec.generateMasterKeyB64();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyB64, pin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const owner = {
        id: "u_owner", name: name.trim(), role: "Owner",
        pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
        permissions: ROLE_PERMISSIONS.Owner,
        active: true, color: USER_COLORS[0],
        createdAt: todayISO(), lastLogin: todayISO(),
      };
      const newSec = { version: 2, users: [owner] };
      await store.set(SEC_META_KEY, JSON.stringify(newSec));
      const masterKey = await Sec.importMasterKey(masterKeyB64);
      setSecUsers([owner]);
      setMasterKeyRaw(masterKeyB64);
      setCryptoKey(masterKey);
      setCurrentUser(owner);
      setData(SEED);
      loaded.current = true;
      setNeedsSetup(false);
      setLocked(false);
      setSection("today"); setView(0);
    } catch (e) {
      setPinError("Setup failed. Please try again.");
    }
  };

  /* ── Logout ── */
  const handleLogout = () => {
    setLocked(true);
    setCryptoKey(null);
    setMasterKeyRaw(null);
    setCurrentUser(null);
    setData({}); // clear decrypted data from memory
    setOpen(null);
    loaded.current = false;
    setPinError("");
  };

  /* ── Calendly Sync ── */
  const CALENDLY_BACKEND    = import.meta.env.VITE_CALENDLY_BACKEND || "";
  // x-frontend-secret is injected by the Vite proxy in dev and by the production
  // reverse proxy (Nginx/Caddy) at the network layer — never via VITE_* env vars,
  // as those are baked into the public JS bundle.
  const _calendlyHeaders    = () => ({});

  const syncCalendly = async () => {
    if (locked) return;
    setCalendlyStatus({ syncing: true });
    try {
      const res = await fetch(`${CALENDLY_BACKEND}/api/calendly/pending`, { headers: _calendlyHeaders() });
      if (!res.ok) throw new Error("Backend unavailable");
      const { events } = await res.json();

      // Match a studio partner by name only (strips "" prefix).
      // City-level matching removed — too prone to false positives across studios in the same city.
      const resolvePartner = (partnersList, ...textFields) => {
        const haystack = textFields.join(" ").toLowerCase();
        return partnersList.find(p => {
          if (!p.name) return false;
          const pName = p.name.replace(/^sample\s*-\s*/i, "").toLowerCase();
          return pName.length > 2 && haystack.includes(pName);
        });
      };

      // Extract studio name + location from a Calendly event name.
      // Handles "Studio Name - Location" and "Studio Name · Journey" formats.
      const extractStudio = (eventName, locationAddress) => {
        if (!eventName) return null;
        const dashIdx = eventName.indexOf(" - ");
        if (dashIdx > 0) return { name: eventName.slice(0, dashIdx).trim(), location: eventName.slice(dashIdx + 3).trim() || locationAddress || "" };
        const dotIdx = eventName.indexOf(" · ");
        if (dotIdx > 0) return { name: eventName.slice(0, dotIdx).trim(), location: locationAddress || "" };
        return null;
      };

      let processed = 0;
      const ids = [];
      setData(prev => {
        let next = { ...prev };
        const clients       = [...(next.clients       || [])];
        const registrations = [...(next.registrations || [])];
        const sessions      = [...(next.sessions      || [])];
        const followups     = [...(next.followups     || [])];
        const partners      = [...(next.partners      || [])];

        const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0,10); };

        // Always retroactively fix Calendly-synced sessions missing a studioId or with wrong capacity
        sessions.forEach((s, i) => {
          if (!s.calendlyEventUri) return;
          let updated = { ...s };
          let changed = false;

          // Fix missing studioId
          if (!s.studioId) {
            const linkedReg = registrations.find(r => r.sessionId === s.id);
            const match = resolvePartner(partners, s.name, s.notes || "", linkedReg?.locationAddress || "");
            if (match) { updated.studioId = match.id; changed = true; }
          }

          // Fix capacity: all virtual Calendly 1:1 sessions should have capacity 1
          const isVirtualSession = !updated.studioId && (updated.locationType === "zoom" || updated.locationType === "custom" || !updated.locationType);
          if (isVirtualSession && s.capacity !== 1) { updated.capacity = 1; changed = true; }


          if (changed) sessions[i] = updated;
        });

        if (!events.length) return { ...next, sessions, partners };

        events.forEach(rawEvt => {
          // Sanitize all string fields from external webhook data before use
          const san = (v) => Sec.sanitize(v);
          const evt = {
            ...rawEvt,
            name:            san(rawEvt.name),
            email:           san(rawEvt.email),
            phone:           san(rawEvt.phone),
            eventName:       san(rawEvt.eventName),
            description:     san(rawEvt.description),
            locationAddress: san(rawEvt.locationAddress),
            howHeard:        san(rawEvt.howHeard),
            referredBy:      san(rawEvt.referredBy),
            concerns:        san(rawEvt.concerns),
            cancelReason:    san(rawEvt.cancelReason),
            // locationJoinUrl validated separately by https:// check before use
          };

          if (evt.eventType === "invitee.created") {
            // 1. Create or update client by email
            const emailNorm = (evt.email || "").toLowerCase();
            let client = clients.find(c => (c.email || "").toLowerCase() === emailNorm);
            const _startDt = evt.startTime ? new Date(evt.startTime) : null;
            const sessionDate = _startDt
              ? `${_startDt.getFullYear()}-${String(_startDt.getMonth() + 1).padStart(2, "0")}-${String(_startDt.getDate()).padStart(2, "0")}`
              : "";
            const sessionTime = _startDt ? _startDt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
            const durationMins = (evt.startTime && evt.endTime)
              ? Math.round((new Date(evt.endTime) - new Date(evt.startTime)) / 60000)
              : 0;

            if (!client) {
              client = {
                id: uid("c"), name: evt.name, email: emailNorm,
                phone: evt.phone || "", source: "Calendly", status: "Booked",
                clientType: "First-time attendee", tags: [],
                firstSession: sessionDate, sessionsAttended: 0,
                lastSession: "", nextSession: sessionDate,
                packageType: "None", lifetimeValue: 0,
                notes: evt.doneBreathworkBefore ? `Done breathwork before: ${evt.doneBreathworkBefore}` : "",
                referral: evt.referredBy ? "High" : "Low",
              };
              clients.push(client);
            } else {
              const idx = clients.indexOf(client);
              clients[idx] = {
                ...client,
                name: evt.name || client.name,
                phone: evt.phone || client.phone,
                status: client.status === "Lead" ? "Booked" : client.status,
                nextSession: sessionDate || client.nextSession,
              };
              client = clients[idx];
            }

            // 2. Upsert session record (one per unique Calendly event URI)
            let sessionId = "";
            if (evt.calendlyEventUri) {
              const isPhysical = evt.locationType === "physical" || (!evt.locationType && evt.locationAddress && evt.locationType !== "zoom");
              let matchedPartner = resolvePartner(partners, evt.eventName || "", evt.locationAddress || "");

              // No match — if the event looks like a studio event, auto-create the partner
              if (!matchedPartner && isPhysical) {
                const extracted = extractStudio(evt.eventName || "", evt.locationAddress || "");
                if (extracted?.name) {
                  // Only create if no partner already has this name
                  const alreadyExists = partners.find(p => p.name.replace(/^sample\s*-\s*/i, "").toLowerCase() === extracted.name.toLowerCase());
                  if (!alreadyExists) {
                    const newPartner = {
                      id: uid("sp"),
                      name: extracted.name,
                      location: extracted.location,
                      studioType: "Yoga",
                      contact: "", role: "", email: "", phone: "",
                      stage: "Recurring partner",
                      estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0,
                      closeProbability: "Closed Won", revShare: "",
                      contractStatus: "None", outreachDate: "", lastTouch: sessionDate,
                      nextAction: "", avgAttendance: 0, sessionsPerMonth: 0,
                      insuranceReqs: "", promotionCommitments: "",
                      notes: `Auto-created from Calendly booking on ${sessionDate}`,
                      checklist: emptyChecklist(),
                    };
                    partners.push(newPartner);
                    matchedPartner = newPartner;
                  } else {
                    matchedPartner = alreadyExists;
                  }
                }
              }

              const resolvedStudioId = matchedPartner?.id || "";

              const existingSessionIdx = sessions.findIndex(s => s.calendlyEventUri === evt.calendlyEventUri);
              if (existingSessionIdx >= 0) {
                // Update registered count; also backfill studioId and zoom link if missing
                const regsForEvent = registrations.filter(r => r.calendlyEventUri === evt.calendlyEventUri && r.status !== "canceled").length + 1;
                const existingSession = sessions[existingSessionIdx];
                const zoomUrl = evt.locationJoinUrl || existingSession.locationJoinUrl || "";
                sessions[existingSessionIdx] = {
                  ...existingSession,
                  registered: regsForEvent,
                  studioId: existingSession.studioId || resolvedStudioId,
                  locationJoinUrl: zoomUrl || existingSession.locationJoinUrl,
                  durationMins: existingSession.durationMins || durationMins || 0,
                  calendlyDescription: existingSession.calendlyDescription || evt.description || "",
                  locationAddress: existingSession.locationAddress || evt.locationAddress || "",
                };
                sessionId = sessions[existingSessionIdx].id;
              } else {
                // Detect if virtual vs studio based on location type
                const isVirtual = !resolvedStudioId && !isPhysical;
                const newSession = {
                  id: uid("se"),
                  name: evt.eventName || "Calendly Session",
                  studioId: resolvedStudioId,
                  date: sessionDate,
                  time: sessionTime,
                  status: "Planned",
                  journey: evt.eventName || "Breathwork Basics",
                  capacity: isVirtual ? 1 : 20,
                  registered: 1,
                  attendance: 0, paidAttendees: 0, waivers: 0, noShows: 0,
                  revenue: 0, studioSplit: 0, netRevenue: 0,
                  conversion: 0, packagesSold: 0, referralsGenerated: 0,
                  equipmentNeeded: isVirtual ? "Headset, Zoom setup" : "Headset, portable speaker",
                  roomSetupStatus: "Not started", musicSetupStatus: "Not started",
                  testimonialsCapt: 0, followUpSent: false, rebookOfferSent: false,
                  referralsRequested: false, breakthroughNoted: false,
                  notes: "",
                  durationMins: durationMins || 0,
                  calendlyDescription: evt.description || "",
                  calendlyEventUri: evt.calendlyEventUri,
                  locationType: evt.locationType,
                  locationJoinUrl: evt.locationJoinUrl,
                  locationAddress: evt.locationAddress || "",
                  checklist: emptySessionChecklist(),
                  equipChecklist: emptyEquipChecklist(),
                };
                sessions.push(newSession);
                sessionId = newSession.id;
              }
            }

            // 3. Upsert registration record (one per unique invitee URI)
            const existingRegIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            const regRecord = {
              id: existingRegIdx >= 0 ? registrations[existingRegIdx].id : uid("reg"),
              clientId: client.id, sessionId,
              calendlyInviteeUri: evt.calendlyInviteeUri,
              calendlyEventUri:   evt.calendlyEventUri,
              eventName:          evt.eventName,
              status:             "booked",
              paymentStatus:      "unknown",
              waiverStatus:       "signed", // client accepts waiver during Calendly booking
              scheduledAt:        evt.startTime,
              timezone:           evt.timezone,
              locationType:       evt.locationType,
              locationJoinUrl:    evt.locationJoinUrl,
              locationAddress:    evt.locationAddress,
              attendanceType:     evt.attendanceType,
              checkedIn: false, attended: false, noShow: false,
              doneBreathworkBefore: evt.doneBreathworkBefore,
              howHeard:           evt.howHeard,
              referredBy:         evt.referredBy,
              concerns:           evt.concerns,
              reviewedContraindications: evt.reviewedContraindications,
              notes: "",
            };
            if (existingRegIdx >= 0) registrations[existingRegIdx] = regRecord;
            else registrations.push(regRecord);

            // 4. Create follow-up tasks (only for brand-new registrations)
            if (existingRegIdx < 0 && evt.startTime) {
              const base = new Date(evt.startTime);
              [
                { label: "Send same-day session confirmation/check-in", days: 0 },
                { label: "Send 24-hour post-session follow-up",         days: 1 },
                { label: "Send 72-hour rebooking or package offer",     days: 3 },
              ].forEach(({ label, days }) => {
                if (!followups.some(f => f.clientId === client.id && f.name === label)) {
                  followups.push({ id: uid("f"), name: label, clientId: client.id, stage: client.status, lastContact: todayISO(), futype: "24h", nextAction: addDays(base, days), outcome: "" });
                }
              });
            }
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee.canceled") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], status: evt.rescheduled ? "rescheduled" : "canceled" };
              // Decrement session registered count
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0 && sessions[sessIdx].registered > 0) {
                sessions[sessIdx] = { ...sessions[sessIdx], registered: sessions[sessIdx].registered - 1 };
              }
            }
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee_no_show.created") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], noShow: true, status: "no_show" };
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0) sessions[sessIdx] = { ...sessions[sessIdx], noShows: (sessions[sessIdx].noShows || 0) + 1 };
            }
            processed++;
            ids.push(evt.id);

          } else if (evt.eventType === "invitee_no_show.deleted") {
            const regIdx = registrations.findIndex(r => r.calendlyInviteeUri === evt.calendlyInviteeUri && evt.calendlyInviteeUri);
            if (regIdx >= 0) {
              registrations[regIdx] = { ...registrations[regIdx], noShow: false, status: "booked" };
              const reg = registrations[regIdx];
              const sessIdx = sessions.findIndex(s => s.id === reg.sessionId);
              if (sessIdx >= 0 && sessions[sessIdx].noShows > 0) {
                sessions[sessIdx] = { ...sessions[sessIdx], noShows: sessions[sessIdx].noShows - 1 };
              }
            }
            processed++;
            ids.push(evt.id);
          }
        });

        return { ...next, clients, registrations, sessions, followups, partners };
      });

      // Acknowledge processed events
      if (ids.length) {
        await fetch(`${CALENDLY_BACKEND}/api/calendly/acknowledge`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ..._calendlyHeaders() },
          body: JSON.stringify({ ids }),
        }).catch(() => {});
      }

      const now = new Date();
      setCalendlyStatus({ synced: processed, count: processed, at: now.toLocaleTimeString(), atFull: now.toLocaleString() });
      if (processed > 0) setLastCalendlyReceived({ count: processed, atFull: now.toLocaleString() });
    } catch {
      // Backend not running or unreachable — check silently and surface pending count only
      try {
        const res = await fetch(`${CALENDLY_BACKEND}/api/calendly/pending`, { headers: _calendlyHeaders() });
        const { total } = await res.json();
        if (total > 0) setCalendlyStatus({ pending: total });
        else setCalendlyStatus(null);
      } catch { setCalendlyStatus(null); }
    }
  };

  // Poll for pending Calendly events every 5 minutes when logged in
  useEffect(() => {
    if (locked) return;
    syncCalendly();
    const interval = setInterval(syncCalendly, 5 * 60 * 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked]);

  // Auto-lock after 15 minutes of inactivity
  useEffect(() => {
    if (locked) return;
    const IDLE_MS = 15 * 60 * 1000;
    let timer = setTimeout(() => setLocked(true), IDLE_MS);
    const reset = () => { clearTimeout(timer); timer = setTimeout(() => setLocked(true), IDLE_MS); };
    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, [locked]);

  /* ── Save profile edits ── */
  const handleSaveProfile = async (updates) => {
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    setSecUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    
    try {
      const secRaw = await store.get(SEC_META_KEY);
      const sec = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) return;
      const newSec = { ...sec, users: sec.users.map(u => u.id === currentUser.id ? updated : u) };
      await store.set(SEC_META_KEY, JSON.stringify(newSec));
    } catch (e) { console.error("handleSaveProfile:", e); }
  };

  /* ── Persist on change (encrypted) ── */
  useEffect(() => {
    if (!loaded.current || !cryptoKey) return;
    let alive = true;
    setSaved("saving");
    (async () => {
      try {
        const enc = await Sec.encrypt(data, cryptoKey);
        if (alive) await store.set(STORE_KEY_ENC, enc);
      } catch (_) {}
      finally { if (alive) { setSaved("saved"); setTimeout(() => alive && setSaved("idle"), 1400); } }
    })();
    return () => { alive = false; };
  }, [data, cryptoKey]);

  /* ── Lock gate ── */
  // Derived rollups — must be called unconditionally (Rules of Hooks)
  const derived = useMemo(() => {
    const partnerName = Object.fromEntries((data.partners || []).map((p) => [p.id, p.name]));
    const clientName = Object.fromEntries((data.clients || []).map((c) => [c.id, c.name]));
    const acceptedByClient = {};
    (data.offers || []).forEach((o) => {
      if (o.status === "Accepted") acceptedByClient[o.clientId] = (acceptedByClient[o.clientId] || 0) + (Number(o.price) || 0);
    });
    const sessionsByStudio = {};
    (data.sessions || []).forEach((s) => { (sessionsByStudio[s.studioId] ||= []).push(s); });

    // Expense rollups
    const mo = today.slice(0, 7);
    const yr = today.slice(0, 4);
    const expensesMTD = (data.expenses||[]).filter(e => (e.date||"").startsWith(mo)).reduce((s,e) => s + (+e.amount||0), 0);
    const expensesYTD = (data.expenses||[]).filter(e => (e.date||"").startsWith(yr)).reduce((s,e) => s + (+e.amount||0), 0);
    const netRevMTD   = (data.revenue||[]).filter(r => (r.date||"").startsWith(mo)).reduce((s,r) => s + calcNet(r), 0);
    const opProfit    = netRevMTD - expensesMTD;
    const opMargin    = netRevMTD > 0 ? Math.round((opProfit / netRevMTD) * 100) : null;

    return { partnerName, clientName, acceptedByClient, sessionsByStudio, expensesMTD, expensesYTD, netRevMTD, opProfit, opMargin };
  }, [data, today]);

  if (needsSetup) return <FirstRunSetup onSetup={handleSetupOwner} error={pinError} />;
  if (locked) return <LockScreen onUnlock={handleUnlock} error={pinError} initialising={initialising} users={secUsers} />;

  const update = (db, fn) => setData((d) => ({ ...d, [db]: fn(d[db]) }));
  const can = {
    view:   currentUser?.permissions?.view   ?? false,
    edit:   currentUser?.permissions?.edit   ?? false,
    delete: currentUser?.permissions?.delete ?? false,
    manage: currentUser?.role === "Owner" || !!(currentUser?.permissions?.manage),
  };
  const saveRecord = (db, rec) =>
    update(db, (rows) => (rows.some((r) => r.id === rec.id) ? rows.map((r) => (r.id === rec.id ? rec : r)) : [...rows, rec]));
  const deleteRecord = (db, id) => { update(db, (rows) => rows.filter((r) => r.id !== id)); setOpen(null); };

  const saveCrmSettings = (next) => {
    _crmSettings = next;
    try { localStorage.setItem(CRM_SETTINGS_KEY, JSON.stringify(next)); } catch {}
    setCrmSettings(next);
    // Also persist inside the encrypted data store so settings are protected at rest
    setData(d => ({ ...d, _settings: next }));
  };

  const startSequence = (client) => {
    const startDate = client.lastSession || today;
    const already = (data.sequences || []).some(s => s.clientId === client.id && s.status === "active");
    if (already) return;
    const newSeq = {
      id: uid("sq"),
      clientId: client.id,
      sessionDate: startDate,
      sessionName: client.lastSession ? `Session ${fmtDate(startDate)}` : "Session",
      status: "active",
      steps: makeSequenceSteps(startDate),
    };
    setData(d => ({ ...d, sequences: [...(d.sequences || []), newSeq] }));
  };

  const sections = [
    { id: "today",    label: "Command Center",     Icon: LayoutGrid,  lane: "core" },
    // B2C — individual clients
    { id: "clients",      label: "Clients",            Icon: Users,       lane: "b2c"  },
    { id: "testimonials", label: "Testimonials",       Icon: ArrowUpRight, lane: "b2c" },
    { id: "followups",    label: "Follow-Ups",         Icon: RefreshCw,   lane: "b2c"  },
    { id: "referrals",    label: "Referrals",          Icon: Users,       lane: "b2c"  },
    { id: "engine",       label: "Follow-up Engine",   Icon: Zap,         lane: "b2c"  },
    // B2B — studio partners
    { id: "partners", label: "Studio Partners",    Icon: Building2,   lane: "b2b"  },
    { id: "outreach", label: "Outreach Hub",       Icon: Send,        lane: "b2b"  },
    // Shared — financial & ops
    { id: "sessions", label: "Sessions",           Icon: CalendarDays,lane: "core" },
    { id: "offers",   label: "Offers & Sales",     Icon: DollarSign,  lane: "core" },
    { id: "revenue",  label: "Revenue",            Icon: TrendingUp,  lane: "core" },
    { id: "expenses", label: "Expenses",           Icon: BarChart2,   lane: "core" },
    { id: "registrations", label: "Calendly Bookings", Icon: CalendarCheck, lane: "core" },
    { id: "workflows", label: "Workflows",        Icon: Milestone,   lane: "core" },
    { id: "content",   label: "Content Calendar",  Icon: Megaphone,   lane: "core" },
    { id: "templates", label: "Templates",          Icon: Copy,        lane: "core" },
    { id: "admin",     label: "Admin",              Icon: Shield,      lane: "core" },
    { id: "users",     label: "User Management",    Icon: Users,       lane: "core", parent: "admin" },
  ];

  const go = (id, view = 0) => { setSection(id); setView(view); setQuery(""); setNavOpen(false); };

  return (
    <div style={{ background: C.bg, color: C.ink, fontFamily: FONT.body, minHeight: 600 }}>
      <style>{CSS}</style>

      <div className="sb-shell">
        {/* Sidebar */}
        <aside className={"sb-sidebar" + (navOpen ? " sb-open" : "")}>
          <div style={{ padding: "20px 18px 16px" }}>
            <img src={LOGO} alt="Simply Breathe" style={{ display: "block", width: "84%", maxWidth: 172, margin: "0 auto 14px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
              <BreathMark size={22} />
              <span style={{ fontSize: 11, color: C.ink3, letterSpacing: "0.18em", textTransform: "uppercase" }}>Operating System</span>
            </div>
          </div>
          <nav style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Command center first */}
            {sections.filter(s => s.id === "today").map(s => {
              const active = section === s.id;
              return (
                <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                  style={{ background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                  <s.Icon size={17} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                </button>
              );
            })}

            {/* Lane groups */}
            {[{ key: "b2b", label: "B2B  ·  Studios" }, { key: "b2c", label: "B2C  ·  Clients" }].map(({ key, label }) => {
              const lane = LANE[key];
              const laneSections = sections.filter(s => s.lane === key);
              return (
                <div key={key} style={{ marginTop: 10 }}>
                  {/* Lane divider label */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 7, padding: "5px 6px 4px",
                    marginBottom: 2,
                  }}>
                    <div style={{ height: 1, flex: 1, background: `${lane.color}30` }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: "0.10em",
                      textTransform: "uppercase", color: lane.color, opacity: 0.85,
                    }}>{label}</span>
                    <div style={{ height: 1, flex: 1, background: `${lane.color}30` }} />
                  </div>
                  {laneSections.map(s => {
                    const active = section === s.id;
                    const dueCount = s.id === "engine"
                      ? (data.sequences || []).flatMap(seq =>
                          seq.status === "active" ? seq.steps.filter(st => !st.sent && st.dueDate <= today) : []
                        ).length
                      : null;
                    const count = s.id === "engine" ? null : (data[s.id] || []).length;
                    return (
                      <button key={s.id} onClick={() => go(s.id)} className="sb-navbtn"
                        style={{
                          background: active ? lane.soft : "transparent",
                          color: active ? lane.text : C.ink2,
                          fontWeight: active ? 600 : 500,
                          borderLeft: active ? `2px solid ${lane.color}` : "2px solid transparent",
                          paddingLeft: 10,
                        }}>
                        <s.Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0, color: active ? lane.color : "inherit" }} />
                        <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                        {dueCount > 0 && <span style={{ fontSize: 11, fontWeight: 700, background: "#C0573F", color: "#fff", borderRadius: 20, padding: "1px 7px" }}>{dueCount}</span>}
                        {count != null && <span style={{ fontSize: 11, color: active ? lane.color : C.ink3 }}>{count}</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}

            {/* Shared / core at bottom */}
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 1, background: C.line, margin: "2px 6px 6px" }} />
              {sections.filter(s => s.lane === "core" && s.id !== "today" && !s.parent).map(s => {
                const active = section === s.id;
                const count = (data[s.id] || []).length;
                const children = sections.filter(c => c.parent === s.id);
                const anyChildActive = children.some(c => c.id === section);
                const expanded = active || anyChildActive;
                return (
                  <div key={s.id}>
                    <button onClick={() => go(s.id)} className="sb-navbtn"
                      style={{ background: active ? C.brandSoft : "transparent", color: active ? C.brandDeep : C.ink2, fontWeight: active ? 600 : 500 }}>
                      <s.Icon size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                      <span style={{ flex: 1, textAlign: "left" }}>{s.label}</span>
                      {children.length > 0
                        ? <ChevronRight size={13} style={{ color: C.ink3, transform: expanded ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
                        : (count > 0 && <span style={{ fontSize: 11, color: active ? C.brand : C.ink3 }}>{count}</span>)
                      }
                    </button>
                    {children.length > 0 && expanded && children.map(c => {
                      const cActive = section === c.id;
                      return (
                        <button key={c.id} onClick={() => go(c.id)} className="sb-navbtn"
                          style={{ background: cActive ? C.brandSoft : "transparent", color: cActive ? C.brandDeep : C.ink2, fontWeight: cActive ? 600 : 400, paddingLeft: 30 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: cActive ? C.brand : C.ink3, flexShrink: 0, marginRight: 2 }} />
                          <c.Icon size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
                          <span style={{ flex: 1, textAlign: "left" }}>{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </nav>
          <div style={{ marginTop: "auto", padding: 12 }}>
            {/* Calendly sync status indicator */}
            {!locked && (
              <div
                title={
                  calendlyStatus?.syncing
                    ? "Sync in progress…"
                    : calendlyStatus?.synced != null
                      ? lastCalendlyReceived
                        ? `Last received: ${lastCalendlyReceived.atFull}\n${lastCalendlyReceived.count} booking${lastCalendlyReceived.count !== 1 ? "s" : ""} received from Calendly`
                        : "No bookings received yet this session — syncs every 5 minutes"
                      : calendlyStatus?.pending > 0
                        ? `${calendlyStatus.pending} booking${calendlyStatus.pending !== 1 ? "s" : ""} queued — will sync within 5 minutes`
                        : "Syncs automatically every 5 minutes"
                }
                style={{ marginBottom: 8, padding: "6px 10px", display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.ink3, cursor: "default" }}>
                <RefreshCw size={11} strokeWidth={1.5}
                  style={{ flexShrink: 0, animation: calendlyStatus?.syncing ? "spin 1s linear infinite" : "none", color: calendlyStatus?.pending > 0 ? C.brand : C.ink3 }} />
                <span>
                  {calendlyStatus?.syncing && "Syncing Calendly…"}
                  {calendlyStatus?.synced != null && !calendlyStatus?.syncing && (
                    <>
                      {calendlyStatus.synced > 0
                        ? <span style={{ color: C.brand, fontWeight: 600 }}>{calendlyStatus.synced} record{calendlyStatus.synced !== 1 ? "s" : ""} synced</span>
                        : "Calendly up to date"
                      }
                      <span style={{ display: "block", fontSize: 10, marginTop: 1 }}>Last sync {calendlyStatus.at}</span>
                    </>
                  )}
                  {calendlyStatus?.pending > 0 && !calendlyStatus?.syncing && (
                    <span style={{ color: C.brand, fontWeight: 600 }}>{calendlyStatus.pending} booking{calendlyStatus.pending !== 1 ? "s" : ""} pending…</span>
                  )}
                  {!calendlyStatus && "Calendly sync active"}
                </span>
              </div>
            )}
            {can.edit && <button className="sb-ghost" onClick={() => setImporting(true)}><Upload size={15} /> Import CSVs</button>}
          </div>
        </aside>
        {navOpen && <div className="sb-scrim" onClick={() => setNavOpen(false)} />}

        {/* Main */}
        <main className="sb-main">
          {/* Lane accent stripe */}
          {(() => {
            const cur = sections.find(s => s.id === section);
            const lane = cur?.lane && cur.lane !== "core" ? LANE[cur.lane] : null;
            return lane ? <div style={{ height: 3, background: `linear-gradient(90deg, ${lane.color}, ${lane.color}80)`, flexShrink: 0 }} /> : null;
          })()}
          <header className="sb-header">
            <button className="sb-menu" onClick={() => setNavOpen(true)}><Menu size={20} /></button>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, margin: 0, letterSpacing: "-0.01em" }}>
                {sections.find((s) => s.id === section).label}
              </h1>
              {(() => {
                const cur = sections.find(s => s.id === section);
                const lane = cur?.lane && cur.lane !== "core" ? LANE[cur.lane] : null;
                return lane ? (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                    background: lane.soft, color: lane.text, letterSpacing: "0.06em",
                    textTransform: "uppercase", border: `1px solid ${lane.color}40`,
                  }}>{lane.full}</span>
                ) : null;
              })()}
            </div>
            {section !== "today" && (
              <>
                {!(section === "sessions" && view === 0) && (
                  <div className="sb-search">
                    <Search size={15} color={C.ink3} />
                    <input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} />
                  </div>
                )}
                {can.edit && !["users","admin","workflows"].includes(section) && !(section === "expenses" && view === 0) && (
                  <button className="sb-primary" onClick={() => setOpen({ db: section, record: newRecord(section) })}>
                    <Plus size={16} /> New
                  </button>
                )}
              </>
            )}

            {/* Alerts bell */}
            {(() => {
              const alertList = buildAlerts(data, today).filter(a => !dismissedAlerts.has(a.id));
              const criticalCount = alertList.filter(a => a.severity === "critical").length;
              const warningCount  = alertList.filter(a => a.severity === "warning").length;
              const totalCount    = alertList.length;
              return (
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <button
                    onClick={() => { setShowAlerts(p => !p); setShowProfile(false); }}
                    title={totalCount ? `${criticalCount} critical · ${warningCount} warnings` : "No alerts"}
                    style={{ width: 36, height: 36, borderRadius: "50%", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.25)}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <BellRing size={16} color={C.brand} strokeWidth={1.8} />
                  </button>
                  {totalCount > 0 && (
                    <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: "#C0573F", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", border: `2px solid ${C.surface}` }}>
                      {totalCount}
                    </span>
                  )}

                  {showAlerts && (
                    <>
                      <div onClick={() => setShowAlerts(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                      <div style={{ position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.14)", width: 420, maxWidth: "92vw", maxHeight: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
                        {/* Header */}
                        <div style={{ padding: "14px 16px 10px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <BellRing size={15} color={criticalCount > 0 ? "#C0573F" : C.ink3} />
                          <span style={{ fontWeight: 700, fontSize: 14, color: C.ink, flex: 1 }}>
                            {totalCount ? `${criticalCount > 0 ? `${criticalCount} critical` : ""}${criticalCount > 0 && warningCount > 0 ? " · " : ""}${warningCount > 0 ? `${warningCount} warnings` : ""}` : "All clear"}
                          </span>
                          <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 2 }}><X size={14} /></button>
                        </div>
                        {/* Alert list */}
                        <div style={{ overflowY: "auto", flex: 1 }}>
                          <AlertsPanel data={data} today={today} onOpen={(args) => { setShowAlerts(false); setOpen(args); }} compact dismissed={dismissedAlerts} setDismissed={setDismissedAlerts} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Profile avatar + dropdown */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <button
                onClick={() => setShowProfile(p => !p)}
                title={currentUser?.name}
                style={{ width: 36, height: 36, borderRadius: "50%", background: currentUser?.color || C.brand, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                {currentUser?.avatar
                  ? <img src={currentUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                      {(currentUser?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                }
              </button>

              {showProfile && (
                <>
                  <div onClick={() => setShowProfile(false)} style={{ position: "fixed", inset: 0, zIndex: 49 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 50,
                    background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.12)", minWidth: 220, padding: 6,
                  }}>
                    {/* User info header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 8px" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "50%", background: currentUser?.color || C.brand, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden", position: "relative" }}>
                        {currentUser?.avatar
                          ? <img src={currentUser.avatar} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          : <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                              {(currentUser?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                            </span>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentUser?.name || "User"}</div>
                        <div style={{ fontSize: 11, color: C.ink3 }}>{currentUser?.title || currentUser?.role || "Viewer"}</div>
                        {currentUser?.email && <div style={{ fontSize: 11, color: C.ink3 }}>{currentUser.email}</div>}
                        {currentUser?.lastLogin && <div style={{ fontSize: 11, color: C.ink3 }}>Last login: {currentUser.lastLogin}</div>}
                      </div>
                    </div>
                    <div style={{ height: 1, background: C.line, margin: "4px 0" }} />

                    {/* Menu items */}
                    <button onClick={() => { setShowProfile(false); setShowEditProfile(true); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.brandMist}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <UserCircle size={14} color={C.ink3} /> Edit Profile
                    </button>

                    {can.manage && (
                      <button onClick={() => { go("users"); setShowProfile(false); }}
                        style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: C.ink, textAlign: "left" }}
                        onMouseEnter={e => e.currentTarget.style.background = C.brandMist}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <Users size={14} color={C.ink3} /> Manage Users
                      </button>
                    )}

                    <div style={{ height: 1, background: C.line, margin: "4px 0" }} />

                    <button
                      onClick={() => { setShowProfile(false); setConfirm({ message: "Log out of Simply Breathe OS?", okLabel: "Log Out", danger: true, onOk: handleLogout }); }}
                      style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 12px", border: "none", borderRadius: 8, background: "transparent", cursor: "pointer", fontSize: 13, color: "#B91C1C", textAlign: "left" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#FEE2E2"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <LogOut size={14} /> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </header>

          <div className="sb-content">
            {section === "today"
              ? <Today data={data} derived={derived} today={today} onOpen={setOpen} onGo={go} />
              : section === "engine"
              ? <FollowUpEngine data={data} setData={setData} today={today} onOpen={setOpen} canEdit={can.edit} />
              :               <Section section={section} data={data} derived={derived} today={today}
                  view={view} setView={setView} query={query} onOpen={setOpen}
                  currentUser={currentUser} secUsers={secUsers} masterKeyRaw={masterKeyRaw} setSecUsers={setSecUsers} setData={setData} canEdit={can.edit} setConfirm={setConfirm} crmSettings={crmSettings} saveCrmSettings={saveCrmSettings} />}
          </div>
        </main>
      </div>

      {open && (
        <RecordDrawer db={open.db} record={open.record} data={data} derived={derived} today={today}
          crmSettings={crmSettings}
          onClose={() => setOpen(null)} onSave={can.edit ? (rec) => { saveRecord(open.db, rec); setOpen(null); } : null}
          onDelete={can.delete ? (id) => setConfirm({
            message: `Delete this record? This action cannot be undone.`,
            okLabel: "Delete", danger: true,
            onOk: () => deleteRecord(open.db, id),
          }) : null} onOpenRelated={setOpen}
          sequences={data.sequences || []} onStartSequence={can.edit ? startSequence : null} />
      )}

      {importing && <ImportModal data={data} setData={setData} onClose={() => setImporting(false)} />}
      {showEditProfile && (
        <EditProfileModal
          user={currentUser}
          masterKeyRaw={masterKeyRaw}
          onSave={handleSaveProfile}
          onClose={() => setShowEditProfile(false)}
        />
      )}
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          okLabel={confirm.okLabel || "OK"}
          danger={confirm.danger}
          onOk={() => { confirm.onOk(); setConfirm(null); }}
          onCancel={() => setConfirm(null)} />
      )}
    </div>
  );
}

/* ---------- New blank record per db ---------- */
function newRecord(db) {
  const base = { id: uid(db) };
  const m = {
    clients: { name: "", phone: "", email: "", source: "Post-session", status: "Lead", clientType: "First-time attendee", tags: [], firstSession: "", sessionsAttended: 0, lastSession: "", nextSession: "", packageType: "None", lifetimeValue: 0, notes: "", referral: "Low" },
    partners: { name: "", studioType: "Yoga", location: "", contact: "", role: "Owner", email: "", phone: "", stage: "Target identified", estimatedCommunitySize: 0, bestFitJourney: "", revenuePotential: 0, closeProbability: "Low", revShare: "", contractStatus: "None", outreachDate: "", lastTouch: todayISO(), nextAction: "", avgAttendance: 0, sessionsPerMonth: 0, insuranceReqs: "", promotionCommitments: "", notes: "", checklist: emptyChecklist() },
    sessions: { name: "", studioId: "", date: todayISO(), time: "", durationMins: 0, status: "Planned", journey: "Breathwork Basics", capacity: 20, registered: 0, attendance: 0, paidAttendees: 0, waivers: 0, noShows: 0, revenue: 0, studioSplit: 0, netRevenue: 0, conversion: 0, packagesSold: 0, referralsGenerated: 0, equipmentNeeded: "", roomSetupStatus: "Not started", musicSetupStatus: "Not started", testimonialsCapt: 0, followUpSent: false, rebookOfferSent: false, referralsRequested: false, breakthroughNoted: false, notes: "", calendlyEventUri: "", locationType: "", locationJoinUrl: "", locationAddress: "", checklist: emptySessionChecklist(), equipChecklist: emptyEquipChecklist() },
    offers:    { name: "", clientId: "", offerType: "Single session", price: 0, status: "Drafted", probability: "50%", source: "", dateOffered: todayISO(), expireDate: "", followUpDate: "", notes: "", reasonLost: "" },
    revenue:   { name: "", date: todayISO(), channel: "Studio session", source: "", campaign: "", sessionId: "", clientId: "", gross: 0, stripeFee: 0, studioSplit: 0, facilitatorCost: 0, refunds: 0, costCenter: "Studio sessions", notes: "" },
    content: { name: "", category: "Breathwork education", status: "Idea", platform: "Instagram", scheduledDate: "", datePosted: "", body: "", cta: "Book a session", sessionId: "", partnerId: "", reused: false, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0, engagement: 0, leads: 0, booked: 0, revenue: 0, notes: "" },
    followups: { name: "", clientId: "", stage: "Lead", lastContact: todayISO(), futype: "24h", nextAction: "", outcome: "" },
    referrals: { referrerId: "", referredName: "", referredId: "", date: todayISO(), status: "Referred", revenue: 0, thankYouSent: false, rewardGiven: false, notes: "" },
    outreach:  { name: "", targetType: "Studio", contactName: "", email: "", phone: "", location: "", source: "Cold outreach", warmth: "Cold", priority: "Medium", status: "Not contacted", responseStatus: "Pending", outreachMessage: "", lastContact: "", nextFollowUp: "", revenuePotential: 0, partnerId: "", notes: "" },
    testimonials: { name: "", clientId: "", sessionId: "", status: "Breakthrough noted", type: "Written", content: "", bestQuote: "", beforeSummary: "", afterSummary: "", themes: [], permissionReceived: false, useOnWebsite: false, useOnSocial: false, firstNameOnly: false, videoUrl: "", dateReceived: "", datePublished: "", notes: "" },
    templates:    { name: "", category: "Post-Session", channel: "Email", subject: "", body: "", variables: "", linkedTo: "clients", usageCount: 0, notes: "" },
    expenses:     { date: "", vendor: "", description: "", amount: 0, category: "Equipment & Supplies", paymentMethod: "Credit Card", taxDeductible: true, recurring: false, recurringFreq: "One-time", linkedSession: "", linkedPartner: "", receiptUrl: "", notes: "" },
    registrations: { clientId: "", sessionId: "", calendlyInviteeUri: "", calendlyEventUri: "", eventName: "", status: "booked", paymentStatus: "unknown", waiverStatus: "pending", scheduledAt: "", timezone: "", locationType: "", locationJoinUrl: "", locationAddress: "", attendanceType: "", checkedIn: false, attended: false, noShow: false, doneBreathworkBefore: "", howHeard: "", referredBy: "", concerns: "", reviewedContraindications: "", notes: "" },
  };
  return { ...base, ...m[db] };
}

/* ============================================================
   TODAY DASHBOARD — Command Center
   ============================================================ */

const CAT_META = {
  revenue:      { label: "Revenue",      Icon: DollarSign, color: C.brand,    bg: C.brandSoft,   text: C.brandDeep },
  relationship: { label: "Relationship", Icon: Users,      color: C.gold,     bg: "#F6EAD6",     text: "#7A4D0F"   },
  operational:  { label: "Operational",  Icon: Check,      color: "#4A8C6F",  bg: "#E2F0EA",     text: "#1E5239"   },
};
const LANE = {
  b2c:  { label: "B2C", full: "Client Revenue",  color: C.brand,   bg: C.brandSoft, text: C.brandDeep, accent: C.brand,   soft: C.brandSoft  },
  b2b:  { label: "B2B", full: "Studio Revenue",  color: "#6B5CE7", bg: "#EEEAFF",   text: "#3D2DA0",   accent: "#6B5CE7", soft: "#EEEAFF"    },
  core: { label: "",    full: "",                color: C.ink2,    bg: C.surfaceAlt, text: C.ink2,     accent: C.ink2,    soft: C.surfaceAlt },
};
const URGENCY_DOT = { high: "#C0573F", medium: C.gold, low: C.ink3 };

function buildActions(data, derived, today) {
  const daysBetween = (a, b) => (!a || !b) ? 0 : Math.round((new Date(b) - new Date(a)) / 86400000);
  const tomorrowISO = (() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })();
  const actions = [];

  // ── REVENUE ──────────────────────────────────────────────────────────
  // Overdue follow-ups (24h / 72h)
  data.followups
    .filter((f) => !f.outcome && f.nextAction && f.nextAction <= today && (f.futype === "24h" || f.futype === "72h"))
    .forEach((f) => {
      const client = data.clients.find((c) => c.id === f.clientId);
      const d = daysBetween(f.nextAction, today);
      const label = f.futype === "24h" ? "24-hour" : "72-hour";
      actions.push({ id: "fu_" + f.id, priority: d >= 2 ? 1 : 2, urgency: d >= 2 ? "high" : "medium", category: "revenue",
        text: `Call ${cleanName(client?.name || f.name)} — ${label} post-session follow-up ${d > 0 ? `${d} day${d !== 1 ? "s" : ""} overdue` : "due today"}`,
        sub: `${label} follow-up · client since ${fmtDate(client?.firstSession) || "—"}`, db: "followups", record: f });
    });

  // Open offers
  data.offers
    .filter((o) => o.status === "Offered")
    .forEach((o) => {
      const client = data.clients.find((c) => c.id === o.clientId);
      const d = daysBetween(o.dateOffered, today);
      actions.push({ id: "off_" + o.id, priority: d >= 5 ? 2 : 3, urgency: d >= 5 ? "high" : "medium", category: "revenue",
        text: `Follow up with ${cleanName(client?.name || o.name)} — open ${o.offerType} offer${d ? `, offered ${d} day${d !== 1 ? "s" : ""} ago` : ""}`,
        sub: `${o.offerType} · ${money(o.price)} · offered ${fmtDate(o.dateOffered)}`, db: "offers", record: o });
    });

  // Attended 1x — no rebook
  data.clients
    .filter((c) => c.status === "Attended 1x" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "reb_" + c.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Rebook ${cleanName(c.name)} — attended once on ${fmtDate(c.lastSession)}, no next session set`,
        sub: `Attended 1x · source: ${c.source} · ${c.referral} referral potential`, db: "clients", record: c });
    });

  // Leads with no follow-up at all
  data.clients
    .filter((c) => c.status === "Lead" && !data.followups.some((f) => f.clientId === c.id))
    .forEach((c) => {
      actions.push({ id: "ld_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Convert lead ${cleanName(c.name)} — no follow-up scheduled yet`,
        sub: `Lead · ${c.source} · next session: ${fmtDate(c.nextSession) || "none"}`, db: "clients", record: c });
    });

  // Studio partners needing next step
  data.partners
    .filter((p) => ["Demo completed", "Pilot proposed", "Agreement sent", "Discovery call booked", "Demo session offered"].includes(p.stage))
    .filter((p) => !(derived.sessionsByStudio[p.id] || []).some((s) => s.date >= today))
    .forEach((p) => {
      actions.push({ id: "sp_" + p.id, priority: 3, urgency: "medium", category: "revenue",
        text: `Book next session with ${cleanName(p.name)} — ${p.stage.toLowerCase()}, no upcoming session`,
        sub: `${p.stage} · contact: ${p.contact} · ${p.email}`, db: "partners", record: p });
    });

  // Engaged clients (2-3x) — no package yet
  data.clients
    .filter((c) => c.status === "Engaged (2-3x)" && (!c.packageType || c.packageType === "None" || c.packageType === "Drop-in"))
    .forEach((c) => {
      actions.push({ id: "pkg_" + c.id, priority: 4, urgency: "medium", category: "revenue",
        text: `Offer package to ${cleanName(c.name)} — ${c.sessionsAttended} sessions in, still on drop-in`,
        sub: `Engaged · LTV: ${money(c.lifetimeValue)} · last seen: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // ── RELATIONSHIP ──────────────────────────────────────────────────────
  // Referral follow-ups overdue
  data.followups
    .filter((f) => f.futype === "Referral" && !f.outcome && f.nextAction && f.nextAction <= today)
    .forEach((f) => {
      const client = data.clients.find((c) => c.id === f.clientId);
      actions.push({ id: "ref_" + f.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Thank ${cleanName(client?.name || f.name)} for the referral — follow-up due ${daysBetween(f.nextAction, today) > 0 ? "& overdue" : "today"}`,
        sub: `Referral follow-up · due ${fmtDate(f.nextAction)}`, db: "followups", record: f });
    });

  // Advocates + High-referral — request testimonial
  data.clients
    .filter((c) => c.status === "Advocate" || (c.referral === "High" && Number(c.sessionsAttended) >= 3))
    .filter((c) => !data.followups.some((f) => f.clientId === c.id && f.futype === "Referral" && f.lastContact >= (today.slice(0, 7) + "-01")))
    .slice(0, 3)
    .forEach((c) => {
      actions.push({ id: "tst_" + c.id, priority: 5, urgency: "low", category: "relationship",
        text: `Request a testimonial from ${cleanName(c.name)} — ${c.sessionsAttended} sessions, noted as ${c.referral.toLowerCase()} referral`,
        sub: `${c.status} · last session: ${fmtDate(c.lastSession)}`, db: "clients", record: c });
    });

  // Active partners — no session in 14+ days
  data.partners
    .filter((p) => p.stage === "Recurring partner" || p.stage === "Pilot completed" || p.stage === "First session scheduled")
    .filter((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      return !last || daysBetween(last, today) > 14;
    })
    .forEach((p) => {
      const dates = (derived.sessionsByStudio[p.id] || []).map((s) => s.date).sort();
      const last = dates[dates.length - 1];
      actions.push({ id: "pi_" + p.id, priority: 5, urgency: "low", category: "relationship",
        text: `Check in with ${p.contact} at ${cleanName(p.name)} — ${last ? `last session ${fmtDate(last)}` : "no sessions logged"}`,
        sub: `${p.stage} · ${p.email}`, db: "partners", record: p });
    });

  // Warm contacts to invite — engaged, no upcoming session
  data.clients
    .filter((c) => c.status === "Engaged (2-3x)" && !c.nextSession)
    .forEach((c) => {
      actions.push({ id: "inv_" + c.id, priority: 6, urgency: "low", category: "relationship",
        text: `Invite ${cleanName(c.name)} to an upcoming session — engaged but no next date scheduled`,
        sub: `Engaged · last seen: ${fmtDate(c.lastSession)} · ${c.source}`, db: "clients", record: c });
    });

  // ── DELIVERY ──────────────────────────────────────────────────────────
  // Sessions today
  data.sessions
    .filter((s) => s.date === today)
    .forEach((s) => {
      actions.push({ id: "tod_" + s.id, priority: 1, urgency: "high", category: "operational",
        text: `Session today: ${cleanName(s.name)} — confirm room setup and payment link`,
        sub: `${cleanName(derived.partnerName[s.studioId] || "unknown studio")} · ${today}`, db: "sessions", record: s });
    });

  // Sessions tomorrow
  data.sessions
    .filter((s) => s.date === tomorrowISO)
    .forEach((s) => {
      actions.push({ id: "tmr_" + s.id, priority: 2, urgency: "medium", category: "operational",
        text: `Session tomorrow: ${cleanName(s.name)} — run through setup checklist today`,
        sub: `${cleanName(derived.partnerName[s.studioId] || "unknown studio")} · ${fmtDate(tomorrowISO)}`, db: "sessions", record: s });
    });

  // Attended clients with no follow-up within 4 days
  data.clients
    .filter((c) => c.sessionsAttended > 0 && c.lastSession)
    .filter((c) => {
      const d = daysBetween(c.lastSession, today);
      return d >= 1 && d <= 4 && !data.followups.some((f) => f.clientId === c.id && f.lastContact >= c.lastSession);
    })
    .forEach((c) => {
      actions.push({ id: "nfu_" + c.id, priority: 2, urgency: "medium", category: "operational",
        text: `Log follow-up for ${cleanName(c.name)} — attended ${fmtDate(c.lastSession)}, no follow-up recorded`,
        sub: `${c.status} · ${c.sessionsAttended} session${c.sessionsAttended !== 1 ? "s" : ""}`, db: "clients", record: c });
    });

  const urgencyScore = { high: 0, medium: 1, low: 2 };
  // Referrals needing a thank-you
  (data.referrals || [])
    .filter(r => !r.thankYouSent && r.referrerId)
    .forEach(r => {
      const referrer = data.clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rty_" + r.id, priority: 4, urgency: "medium", category: "relationship",
        text: `Send thank-you to ${cleanName(referrer?.name || "referrer")} — referred ${cleanName(r.referredName)}`,
        sub: `Referral · ${fmtDate(r.date)} · Status: ${r.status}`, db: "referrals", record: r });
    });

  // New referrals not yet contacted
  (data.referrals || [])
    .filter(r => r.status === "Referred" && daysBetween(r.date, today) >= 3)
    .forEach(r => {
      const referrer = data.clients.find(c => c.id === r.referrerId);
      actions.push({ id: "rnc_" + r.id, priority: 5, urgency: "medium", category: "relationship",
        text: `Follow up with ${cleanName(r.referredName)} — referred by ${cleanName(referrer?.name || "?")} ${daysBetween(r.date, today)}d ago`,
        sub: `Not yet contacted · referred ${fmtDate(r.date)}`, db: "referrals", record: r });
    });

  return actions.sort((a, b) => a.priority !== b.priority ? a.priority - b.priority : urgencyScore[a.urgency] - urgencyScore[b.urgency]);
}

/* ── LANE SPLIT PANEL ── */
function LaneSplitPanel({ data, today }) {
  const offers   = data.offers   || [];
  const sessions = data.sessions || [];
  const clients  = data.clients  || [];
  const partners = data.partners || [];
  const revenue  = data.revenue  || [];
  const referrals= data.referrals|| [];

  // ── B2C metrics ──
  const b2cOfferTypes = ["Single session","3-pack","6-pack","12-pack","Private session","Virtual session","Group package"];
  const b2cClosedOffers = offers.filter(o => WON_STATUSES.includes(o.status) && b2cOfferTypes.includes(o.offerType));
  const b2cRevMTD = b2cClosedOffers.filter(o => sameMonth(o.closeDate || o.dateOffered, today))
    .reduce((a, o) => a + (Number(o.price) || 0), 0);
  const b2cOpenPipeline = offers.filter(o => OPEN_STATUSES.includes(o.status) && b2cOfferTypes.includes(o.offerType))
    .reduce((a, o) => a + (Number(o.price) || 0), 0);
  const activeClients = clients.filter(c => ["Member (4+)","Advocate","Engaged (2-3x)"].includes(c.status)).length;
  const refRevenue   = referrals.reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const avgLTV = clients.filter(c => Number(c.lifetimeValue) > 0).length
    ? Math.round(clients.filter(c => Number(c.lifetimeValue) > 0).reduce((a, c) => a + Number(c.lifetimeValue), 0)
        / clients.filter(c => Number(c.lifetimeValue) > 0).length)
    : 0;

  // ── B2B metrics ──
  const b2bSessionRevMTD = sessions.filter(s => sameMonth(s.date, today) && ["Completed","Follow-up pending","Closed out"].includes(s.status))
    .reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const b2bRevItems = revenue.filter(r => ["Studio session","Corporate event"].includes(r.channel) && sameMonth(r.date, today));
  const b2bRevMTD   = b2bRevItems.reduce((a, r) => a + calcNet(r), 0) || b2bSessionRevMTD;
  const studioPipeline = partners.filter(p => p.stage !== "Lost / not a fit")
    .reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const recurringP  = partners.filter(p => p.stage === "Recurring partner").length;
  const activeP     = partners.filter(p => !["Lost / not a fit","Target identified"].includes(p.stage)).length;
  const sessionsThisMonth = sessions.filter(s => sameMonth(s.date, today)).length;

  const b2cLane = LANE.b2c;
  const b2bLane = LANE.b2b;

  const LaneCard = ({ lane, metrics }) => (
    <div style={{ flex: 1, border: `1px solid ${lane.color}35`, borderRadius: 12, overflow: "hidden" }}>
      {/* Lane header */}
      <div style={{ padding: "11px 16px", background: lane.soft, borderBottom: `1px solid ${lane.color}30`,
        display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: lane.color, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: lane.text }}>{lane.full}</span>
        <span style={{ fontSize: 11, color: lane.text, opacity: 0.65, marginLeft: "auto",
          fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{lane.label}</span>
      </div>
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, background: "#fff" }}>
        {metrics.map(({ label, value, sub }, i) => (
          <div key={label} style={{ padding: "13px 14px",
            borderRight: i % 2 === 0 ? `1px solid ${C.line}` : "none",
            borderBottom: i < metrics.length - 2 ? `1px solid ${C.line}` : "none" }}>
            <div style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase",
              letterSpacing: "0.07em", fontWeight: 600, marginBottom: 5 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700,
              color: lane.color, lineHeight: 1.1 }}>{value}</div>
            {sub && <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <h3 style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600, margin: 0 }}>Revenue by Lane</h3>
        <span style={{ fontSize: 12, color: C.ink3 }}>B2C vs B2B breakdown</span>
      </div>
      <div style={{ display: "flex", gap: 14 }} className="sb-lane-split">
        <LaneCard lane={b2bLane} metrics={[
          { label: "Studio rev MTD",   value: money(b2bRevMTD),       sub: "net from sessions" },
          { label: "Studio pipeline",  value: money(studioPipeline),  sub: `${partners.filter(p=>p.stage!=="Lost / not a fit").length} active` },
          { label: "Sessions MTD",     value: sessionsThisMonth,       sub: "this calendar month" },
          { label: "Recurring",        value: recurringP,             sub: `of ${activeP} in pipeline` },
          { label: "Avg session rev",  value: money(sessions.filter(s=>Number(s.netRevenue)>0).length
              ? Math.round(sessions.filter(s=>Number(s.netRevenue)>0).reduce((a,s)=>a+Number(s.netRevenue),0)/sessions.filter(s=>Number(s.netRevenue)>0).length) : 0),
            sub: "net per session" },
          { label: "Total studios",    value: partners.length,        sub: `${recurringP} recurring` },
        ]} />
        <LaneCard lane={b2cLane} metrics={[
          { label: "Revenue MTD",      value: money(b2cRevMTD),       sub: "packages + sessions" },
          { label: "Open pipeline",    value: money(b2cOpenPipeline), sub: `${offers.filter(o=>OPEN_STATUSES.includes(o.status)&&b2cOfferTypes.includes(o.offerType)).length} offers` },
          { label: "Active clients",   value: activeClients,           sub: "engaged + member + advocate" },
          { label: "Avg LTV",          value: money(avgLTV),          sub: "lifetime value" },
          { label: "Referral revenue", value: money(refRevenue),      sub: `${referrals.filter(r=>r.status==="Attended").length} converted` },
          { label: "Total clients",    value: clients.length,         sub: `${clients.filter(c=>c.status==="Lead").length} leads` },
        ]} />
      </div>
    </div>
  );
}

/* ── ALERT ENGINE ── */
const ALERT_SEVERITY = {
  critical: { color: "#C0573F", bg: "#FFF2F0", border: "#F5C4BC", label: "Critical" },
  warning:  { color: "#9B7A2E", bg: "#FFFBF0", border: "#F5E4A8", label: "Warning"  },
  info:     { color: "#2E6FB0", bg: "#F0F6FF", border: "#B8D4F5", label: "Info"     },
};

function buildAlerts(data, today) {
  const alerts = [];
  const daysAgo  = (d) => (!d) ? 0 : Math.round((new Date(today) - new Date(d)) / 86400000);
  const daysAway = (d) => (!d) ? 999 : Math.round((new Date(d) - new Date(today)) / 86400000);
  const weekAgo  = (() => { const d = new Date(today); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); })();

  const sessions  = data.sessions  || [];
  const offers    = data.offers    || [];
  const partners  = data.partners  || [];
  const clients   = data.clients   || [];
  const followups = data.followups || [];

  // 1 — Expired offers still open
  offers.filter(o => OPEN_STATUSES.includes(o.status) && o.expireDate && o.expireDate < today)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      alerts.push({ id: "exp_" + o.id, severity: "critical", category: "revenue",
        title: `Offer expired — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · expired ${fmtDate(o.expireDate)}`,
        db: "offers", record: o });
    });

  // 2 — No follow-up sent 24h+ after completed session
  sessions.filter(s => s.status === "Completed" && !s.followUpSent && daysAgo(s.date) >= 1)
    .forEach(s => {
      const d = daysAgo(s.date);
      alerts.push({ id: "nfu_" + s.id, severity: d >= 3 ? "critical" : "warning", category: "revenue",
        title: `No follow-up sent — ${s.name} (${d} day${d !== 1 ? "s" : ""} ago)`,
        detail: `Follow-up window closing · completed ${fmtDate(s.date)}`,
        db: "sessions", record: s });
    });

  // 3 — Session < 72 h away with < 50% registration
  sessions.filter(s => {
    const away = daysAway(s.date);
    const cap  = Number(s.capacity) || 0;
    const reg  = Number(s.registered) || 0;
    return away >= 0 && away <= 3 && cap > 0 && reg / cap < 0.5;
  }).forEach(s => {
    const away = daysAway(s.date);
    const pct  = Math.round((Number(s.registered) / Number(s.capacity)) * 100);
    alerts.push({ id: "reg_" + s.id, severity: pct < 25 ? "critical" : "warning", category: "operational",
      title: `Low registration — ${s.name} (${pct}% full, ${away === 0 ? "today" : `${away}d away`})`,
      detail: `${s.registered}/${s.capacity} registered · promote now`,
      db: "sessions", record: s });
  });

  // 4 — Waivers missing on completed sessions
  sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    Number(s.attendance) > 0 && Number(s.waivers) < Number(s.attendance)
  ).forEach(s => {
    const missing = Number(s.attendance) - Number(s.waivers);
    alerts.push({ id: "waiv_" + s.id, severity: "warning", category: "operational",
      title: `${missing} waiver${missing !== 1 ? "s" : ""} missing — ${s.name}`,
      detail: `${s.waivers}/${s.attendance} collected · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 5 — Payment not confirmed on completed sessions with revenue
  sessions.filter(s =>
    ["Completed","Closed out","Follow-up pending"].includes(s.status) &&
    !s.paymentConfirmed && Number(s.netRevenue) > 0
  ).forEach(s => {
    alerts.push({ id: "pay_" + s.id, severity: "critical", category: "revenue",
      title: `Payment not confirmed — ${s.name}`,
      detail: `${money(s.netRevenue)} net · ${fmtDate(s.date)}`,
      db: "sessions", record: s });
  });

  // 6 — Offer open > 7 days, no follow-up date set
  offers.filter(o => OPEN_STATUSES.includes(o.status) && daysAgo(o.dateOffered) > 7 && !o.followUpDate)
    .forEach(o => {
      const c = clients.find(x => x.id === o.clientId);
      const d = daysAgo(o.dateOffered);
      alerts.push({ id: "stale_o_" + o.id, severity: "warning", category: "revenue",
        title: `Offer stale ${d} days — ${cleanName(c?.name || o.name)}`,
        detail: `${o.offerType} · ${money(o.price)} · no follow-up scheduled`,
        db: "offers", record: o });
    });

  // 7 — Studio demo done, no proposal > 7 days
  partners.filter(p => p.stage === "Demo completed" && daysAgo(p.lastTouch) > 7)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "demo_" + p.id, severity: "warning", category: "revenue",
        title: `Demo done, no proposal — ${cleanName(p.name)}`,
        detail: `${d} days since last touch · ${p.stage}`,
        db: "partners", record: p });
    });

  // 8 — Room/music setup not started for session < 7 days away
  sessions.filter(s => {
    const away = daysAway(s.date);
    return away >= 0 && away <= 7 && (s.roomSetupStatus === "Not started" || s.musicSetupStatus === "Not started");
  }).forEach(s => {
    const away = daysAway(s.date);
    const items = [s.roomSetupStatus === "Not started" && "room", s.musicSetupStatus === "Not started" && "music"].filter(Boolean);
    alerts.push({ id: "setup_" + s.id, severity: away <= 2 ? "critical" : "warning", category: "operational",
      title: `Setup not started — ${s.name} (${away === 0 ? "today" : `${away}d away`})`,
      detail: `Pending: ${items.join(", ")} setup`,
      db: "sessions", record: s });
  });

  // 9 — Active partner pipeline with no activity > 14 days
  const inactiveCutoff = ["Lost / not a fit", "Recurring partner", "Target identified", "Researched"];
  partners.filter(p => !inactiveCutoff.includes(p.stage) && daysAgo(p.lastTouch) > 14)
    .forEach(p => {
      const d = daysAgo(p.lastTouch);
      alerts.push({ id: "stale_p_" + p.id, severity: "warning", category: "relationship",
        title: `${cleanName(p.name)} — no activity for ${d} days`,
        detail: `Stage: ${p.stage} · last touch: ${fmtDate(p.lastTouch)}`,
        db: "partners", record: p });
    });

  // 10 — No outreach logged this week
  const hasOutreach = followups.some(f => f.lastContact >= weekAgo) ||
                      partners.some(p => p.lastTouch >= weekAgo);
  if (!hasOutreach) {
    alerts.push({ id: "no_reach", severity: "info", category: "relationship",
      title: "No outreach activity this week",
      detail: "No follow-up or partner contact logged in the last 7 days",
      db: null, record: null });
  }

  // 12 — Breakthrough noted but no testimonial request yet
  const testimonialSessionIds = new Set((data.testimonials || []).map(t => t.sessionId).filter(Boolean));
  sessions.filter(s =>
    s.breakthroughNoted &&
    ["Completed","Follow-up pending","Closed out"].includes(s.status) &&
    !testimonialSessionIds.has(s.id)
  ).forEach(s => {
    const d = daysAgo(s.date);
    alerts.push({ id: "bkt_" + s.id, severity: d > 7 ? "warning" : "info", category: "relationship",
      title: `Testimonial not requested — breakthrough noted at ${s.name}`,
      detail: `Session was ${d} day${d !== 1 ? "s" : ""} ago · window closing`,
      db: "sessions", record: s });
  });

  // 11 — Referral thank-you overdue > 3 days
  (data.referrals || []).filter(r => !r.thankYouSent && r.referrerId && daysAgo(r.date) > 3)
    .forEach(r => {
      const referrer = clients.find(c => c.id === r.referrerId);
      alerts.push({ id: "rty_" + r.id, severity: "info", category: "relationship",
        title: `Thank-you overdue — ${cleanName(referrer?.name || "referrer")} sent a referral`,
        detail: `Referred ${cleanName(r.referredName)} · ${daysAgo(r.date)} days ago`,
        db: "referrals", record: r });
    });

  const order = { critical: 0, warning: 1, info: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}

function AlertsPanel({ data, today, onOpen, compact, dismissed: dismissedProp, setDismissed: setDismissedProp }) {
  const [localDismissed, setLocalDismissed] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ALERTS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const dismissed    = dismissedProp    ?? localDismissed;
  const setDismissed = setDismissedProp ?? setLocalDismissed;
  const [expanded, setExpanded] = useState(false);

  const all     = buildAlerts(data, today).filter(a => !dismissed.has(a.id));
  const critical = all.filter(a => a.severity === "critical").length;
  const warning  = all.filter(a => a.severity === "warning").length;
  const SHOW_MAX = expanded ? all.length : (compact ? all.length : 5);
  const shown    = all.slice(0, SHOW_MAX);

  if (all.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", color: "#1E5239" }}>
      <Check size={16} color="#4A8C6F" strokeWidth={1.5} />
      <span style={{ fontWeight: 600, fontSize: 13 }}>All clear — no active alerts</span>
    </div>
  );

  return (
    <div style={compact ? {} : { border: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`, borderRadius: 12, overflow: "hidden" }}>
      {/* Alert rows */}
      <div style={{ background: compact ? "transparent" : "#fff" }}>
        {shown.map((a, i) => {
          const sv = ALERT_SEVERITY[a.severity];
          const SvIcon = a.severity === "info" ? Info : AlertCircle;
          return (
            <div key={a.id} style={{
              display: "flex", alignItems: "flex-start", gap: 11, padding: "11px 14px",
              borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft || C.line}` : "none",
              borderLeft: `3px solid ${sv.color}`,
            }}>
              <SvIcon size={14} color={sv.color} strokeWidth={1.5} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{a.detail}</div>
              </div>
              <div style={{ display: "flex", gap: 5, flexShrink: 0, marginTop: 1 }}>
                {a.record && (
                  <button onClick={() => onOpen({ db: a.db, record: a.record })} style={{
                    fontSize: 11.5, fontWeight: 600, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                    background: sv.bg, color: sv.color, border: `1px solid ${sv.border}`,
                  }}>View</button>
                )}
                <button onClick={() => setDismissed(prev => {
                  const next = new Set([...prev, a.id]);
                  try { localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify([...next])); } catch {}
                  return next;
                })} style={{
                  fontSize: 11.5, padding: "3px 8px", borderRadius: 6, cursor: "pointer",
                  background: "transparent", color: C.ink3, border: `1px solid ${C.line}`,
                }} title="Dismiss">×</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / collapse */}
      {!compact && all.length > 5 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          width: "100%", padding: "9px 14px",
          background: critical > 0 ? ALERT_SEVERITY.critical.bg : ALERT_SEVERITY.warning.bg,
          border: "none",
          borderTop: `1px solid ${critical > 0 ? ALERT_SEVERITY.critical.border : ALERT_SEVERITY.warning.border}`,
          cursor: "pointer", fontSize: 12.5, fontWeight: 600,
          color: critical > 0 ? ALERT_SEVERITY.critical.color : ALERT_SEVERITY.warning.color,
          textAlign: "center",
        }}>
          {expanded ? "Show fewer ↑" : `Show ${all.length - 5} more alerts ↓`}
        </button>
      )}
    </div>
  );
}

/* ── PIPELINE SNAPSHOT ── */
function PipelineSnapshot({ data, today }) {
  const offers        = data.offers   || [];
  const partners      = data.partners || [];
  const sessions      = data.sessions || [];
  const clients       = data.clients  || [];
  const revenue       = data.revenue  || [];

  // Open offer pipeline
  const openOffers      = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const openPipelineVal = openOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);
  const openPipelineWt  = openOffers.reduce((a, o) =>
    a + (Number(o.price) || 0) * ((Number(o.probability) || 50) / 100), 0);

  // Studio pipeline — non-lost partners, sum revenuePotential
  const lostStage       = "Lost / not a fit";
  const studioPartners  = partners.filter(p => p.stage !== lostStage);
  const recurringP      = partners.filter(p => p.stage === "Recurring partner");
  const studioPipeVal   = studioPartners.reduce((a, p) => a + (Number(p.revenuePotential) || 0), 0);
  const partnerConvRate = studioPartners.length > 0
    ? Math.round((recurringP.length / studioPartners.length) * 100) : 0;

  // Expected this month: upcoming sessions (not completed) + weighted open offers
  const preSessions     = sessions.filter(s =>
    sameMonth(s.date, today) && ["Planned","Booking open","Promotion active","Almost full"].includes(s.status));
  const bookedVal       = preSessions.reduce((a, s) => a + (Number(s.grossRevenue) || 0), 0);
  const expected30d     = bookedVal + openPipelineWt;

  // Booked but not delivered
  const bookedNotDel    = preSessions.length;
  const bookedNotDelVal = bookedVal;

  // Delivered but unpaid — completed sessions without paymentConfirmed
  const unpaidSessions  = sessions.filter(s =>
    ["Completed","Follow-up pending","Closed out"].includes(s.status) && !s.paymentConfirmed);
  const unpaidVal       = unpaidSessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);

  // Offers awaiting response (Sent / Viewed)
  const awaitingOffers  = offers.filter(o => ["Sent", "Viewed"].includes(o.status));
  const awaitingVal     = awaitingOffers.reduce((a, o) => a + (Number(o.price) || 0), 0);

  // Average client value — use clients with any recorded totalSpend
  const payingClients   = clients.filter(c => Number(c.totalSpend) > 0);
  const avgClientVal    = payingClients.length > 0
    ? payingClients.reduce((a, c) => a + (Number(c.totalSpend) || 0), 0) / payingClients.length : 0;

  // Average session net revenue
  const sessionsWithRev = sessions.filter(s => Number(s.netRevenue) > 0);
  const avgSessionRev   = sessionsWithRev.length > 0
    ? sessionsWithRev.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0) / sessionsWithRev.length : 0;

  const totalPotential  = openPipelineVal + studioPipeVal;

  const tiles = [
    {
      label: "Open offer pipeline",
      value: money(openPipelineVal),
      sub: `${openOffers.length} offers · ${money(Math.round(openPipelineWt))} weighted`,
      accent: C.brand, Icon: TrendingUp,
    },
    {
      label: "Studio partner pipeline",
      value: money(studioPipeVal),
      sub: `${studioPartners.length} studios active`,
      accent: "#6B5CE7", Icon: Building2,
    },
    {
      label: "Expected 30-day revenue",
      value: money(Math.round(expected30d)),
      sub: "upcoming sessions + weighted offers",
      accent: C.gold, Icon: CalendarDays,
    },
    {
      label: "Booked, not delivered",
      value: money(bookedNotDelVal),
      sub: `${bookedNotDel} upcoming session${bookedNotDel !== 1 ? "s" : ""}`,
      accent: C.ink2, Icon: Clock,
    },
    {
      label: "Delivered, unpaid",
      value: money(unpaidVal),
      sub: `${unpaidSessions.length} session${unpaidSessions.length !== 1 ? "s" : ""} pending payment`,
      accent: unpaidVal > 0 ? "#E05454" : C.ink3, Icon: AlertCircle,
    },
    {
      label: "Offers awaiting response",
      value: money(awaitingVal),
      sub: `${awaitingOffers.length} offer${awaitingOffers.length !== 1 ? "s" : ""} sent or viewed`,
      accent: C.gold, Icon: Send,
    },
    {
      label: "Avg client value",
      value: money(Math.round(avgClientVal)),
      sub: `across ${payingClients.length} paying client${payingClients.length !== 1 ? "s" : ""}`,
      accent: C.brand, Icon: Users,
    },
    {
      label: "Avg session net revenue",
      value: money(Math.round(avgSessionRev)),
      sub: `${sessionsWithRev.length} session${sessionsWithRev.length !== 1 ? "s" : ""} with revenue`,
      accent: C.brand, Icon: BarChart2,
    },
    {
      label: "Partner conversion rate",
      value: `${partnerConvRate}%`,
      sub: `${recurringP.length} of ${studioPartners.length} recurring`,
      accent: "#4A8C6F", Icon: Check,
    },
    {
      label: "Expenses MTD",
      value: money((data.expenses||[]).filter(e=>(e.date||"").startsWith(today.slice(0,7))).reduce((s,e)=>s+(+e.amount||0),0)),
      sub: "operating costs this month",
      accent: "#EF4444", Icon: Receipt,
    },
    {
      label: "Operating profit MTD",
      value: (() => {
        const mo = today.slice(0,7);
        const exp = (data.expenses||[]).filter(e=>(e.date||"").startsWith(mo)).reduce((s,e)=>s+(+e.amount||0),0);
        const net = sessions.filter(s=>(s.date||"").startsWith(mo)&&s.status==="Completed").reduce((s,r)=>s+(+r.netRevenue||0),0);
        return money(net - exp);
      })(),
      sub: "net revenue minus expenses",
      accent: (() => {
        const mo = today.slice(0,7);
        const exp = (data.expenses||[]).filter(e=>(e.date||"").startsWith(mo)).reduce((s,e)=>s+(+e.amount||0),0);
        const net = sessions.filter(s=>(s.date||"").startsWith(mo)&&s.status==="Completed").reduce((s,r)=>s+(+r.netRevenue||0),0);
        return (net-exp) >= 0 ? "#16A34A" : "#E05454";
      })(),
      Icon: TrendingUp,
    },
  ];

  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "baseline", gap: 10, borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>Pipeline at a Glance</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: C.ink3, fontWeight: 500 }}>Total potential</span>
        <span style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: C.brand }}>
          {money(totalPotential)}
        </span>
      </div>

      {/* Tile grid */}
      <div style={{ padding: "14px 14px 14px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}
           className="sb-pipeline-grid">
        {tiles.map(({ label, value, sub, accent, Icon }) => (
          <div key={label} style={{
            padding: "13px 14px", borderRadius: 10,
            background: C.surfaceAlt, border: `1px solid ${C.line}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
              <Icon size={12} color={accent} strokeWidth={1.5} />
              <span style={{ fontSize: 11, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600, lineHeight: 1.2 }}>
                {label}
              </span>
            </div>
            <div style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 700, color: accent, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 11, color: C.ink3, marginTop: 5, lineHeight: 1.4 }}>{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISMISSED_ACTIONS_KEY = "sb:dismissed-actions:v1";

function Today({ data, derived, today, onOpen, onGo }) {
  const [showAll, setShowAll] = useState(null); // null | "revenue" | "relationship" | "operational"
  const [dismissedActions, setDismissedActions] = useState(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_ACTIONS_KEY);
      if (!stored) return new Set();
      const { date, ids } = JSON.parse(stored);
      return date === today ? new Set(ids) : new Set(); // reset each day
    } catch { return new Set(); }
  });

  const dismissAction = (id) => setDismissedActions(prev => {
    const next = new Set([...prev, id]);
    try { localStorage.setItem(DISMISSED_ACTIONS_KEY, JSON.stringify({ date: today, ids: [...next] })); } catch {}
    return next;
  });

  const actions = buildActions(data, derived, today).filter(a => !dismissedActions.has(a.id));
  const byCategory = {
    revenue:      actions.filter(a => a.category === "revenue"),
    relationship: actions.filter(a => a.category === "relationship"),
    operational:  actions.filter(a => a.category === "operational"),
  };

  const mtdRevenue = derived.netRevMTD;
  const activeSeqs   = (data.sequences || []).filter(s => s.status === "active").length;
  const refRevenue   = (data.referrals || []).reduce((a, r) => a + (Number(r.revenue) || 0), 0);
  const activeMembers = (data.clients || []).length;

  const d = new Date();
  const greeting = d.getHours() < 12 ? "Good morning" : d.getHours() < 18 ? "Good afternoon" : "Good evening";

  const totalActions = actions.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Hero */}
      <div className="sb-hero">
        <BreathMark size={62} animate />
        <div>
          <div style={{ fontSize: 13, color: C.brand, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 600 }}>
            {fmtDate(today, true)}
          </div>
          <h2 style={{ fontFamily: FONT.display, fontSize: 26, margin: "4px 0 0", fontWeight: 600, letterSpacing: "-0.01em" }}>
            {greeting}. Take one slow breath, then begin.
          </h2>
        </div>
      </div>

      {/* ── NEXT BEST ACTIONS (above stats) ── */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
            Next Best Actions
          </h3>
          {totalActions > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: URGENCY_DOT.high, color: "#fff", borderRadius: 20, padding: "2px 9px" }}>
              {totalActions} pending
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }} className="sb-nba-grid">
          {Object.entries(CAT_META).map(([cat, meta]) => {
            const all  = byCategory[cat] || [];
            const top3 = all.slice(0, 3);
            const rest = all.length - 3;
            const isExpanded = showAll === cat;
            const shown = isExpanded ? all : top3;
            const { Icon } = meta;

            return (
              <div key={cat} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                {/* Column header */}
                <div style={{ padding: "13px 15px 12px", background: meta.bg, borderBottom: `1px solid ${hexA(meta.color, 0.18)}`, display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon size={14} color={meta.color} strokeWidth={1.5} />
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: meta.text, flex: 1 }}>{meta.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.text, opacity: 0.65 }}>
                    {all.length} action{all.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Action list */}
                <div style={{ flex: 1 }}>
                  {shown.length === 0 ? (
                    <div style={{ padding: "22px 14px", textAlign: "center", color: C.ink3, fontSize: 13 }}>
                      <span style={{ fontSize: 18 }}>✓</span>
                      <div style={{ marginTop: 4, fontWeight: 500 }}>All clear</div>
                    </div>
                  ) : shown.map((a, i) => (
                    <div key={a.id} style={{
                        display: "flex", alignItems: "flex-start",
                        borderBottom: i < shown.length - 1 ? `1px solid ${C.lineSoft}` : "none",
                      }}>
                      <button
                        onClick={() => a.record ? onOpen({ db: a.db, record: a.record }) : null}
                        style={{
                          flex: 1, display: "flex", alignItems: "flex-start", gap: 9,
                          padding: "11px 6px 11px 13px",
                          background: "transparent", border: "none",
                          cursor: a.record ? "pointer" : "default", textAlign: "left",
                        }}
                        className={a.record ? "sb-nba-row" : ""}
                      >
                        {/* Urgency dot + number */}
                        <span style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: URGENCY_DOT[a.urgency],
                          color: "#fff", fontSize: 10, fontWeight: 800,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 1,
                        }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{a.text}</div>
                          {a.sub && <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2, lineHeight: 1.4 }}>{a.sub}</div>}
                        </div>
                        {a.record && <ChevronRight size={13} color={C.ink3} style={{ flexShrink: 0, marginTop: 3 }} />}
                      </button>
                      <button
                        onClick={() => dismissAction(a.id)}
                        title="Dismiss for today"
                        style={{
                          padding: "11px 10px", background: "transparent", border: "none",
                          cursor: "pointer", color: C.ink3, fontSize: 14, lineHeight: 1,
                          flexShrink: 0, alignSelf: "stretch", display: "flex", alignItems: "center",
                          opacity: 0.5,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.5"}
                      >×</button>
                    </div>
                  ))}
                </div>

                {/* Footer: expand / collapse */}
                {rest > 0 && !isExpanded && (
                  <button onClick={() => setShowAll(cat)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: meta.color, textAlign: "center",
                  }}>
                    +{rest} more {meta.label.toLowerCase()} action{rest !== 1 ? "s" : ""}
                  </button>
                )}
                {isExpanded && all.length > 3 && (
                  <button onClick={() => setShowAll(null)} style={{
                    padding: "9px 14px", background: "transparent", border: "none",
                    borderTop: `1px solid ${C.line}`, cursor: "pointer", width: "100%",
                    fontSize: 12, fontWeight: 600, color: C.ink3, textAlign: "center",
                  }}>
                    Show less ↑
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Net revenue MTD"   value={money(mtdRevenue)}  hint="completed sessions this month"      onClick={() => onGo("revenue", 1)} />
        <Stat label="Referral revenue"  value={money(refRevenue)}  hint="from all referrals" accent={refRevenue > 0 ? "#4A8C6F" : C.ink3} onClick={() => onGo("referrals")} />
        <Stat label="Active clients"    value={activeMembers}      hint="total clients in system"            onClick={() => onGo("clients")} />
        <Stat label="Active sequences"  value={activeSeqs}         hint="clients in follow-up nurture"       onClick={() => onGo("engine")} />
      </div>

      {/* Pipeline snapshot */}
      <PipelineSnapshot data={data} today={today} />

      {/* B2C vs B2B lane split */}
      <LaneSplitPanel data={data} today={today} />

      {/* Charts */}
      <div className="sb-grid2">
        <Panel title="Revenue trend"><RevenueTrend data={data} /></Panel>
        <Panel title="Clients by source"><SourceBreakdown data={data} /></Panel>
      </div>
    </div>
  );
}

/* ---------- Dashboard charts ---------- */
function RevenueTrend({ data }) {
  const months = {};
  data.sessions.forEach((s) => { if (s.date) { const k = s.date.slice(0, 7); months[k] = (months[k] || 0) + (Number(s.netRevenue) || 0); } });
  data.offers.forEach((o) => { if (o.status === "Accepted" && o.closeDate) { const k = o.closeDate.slice(0, 7); months[k] = (months[k] || 0) + (Number(o.price) || 0); } });
  const keys = Object.keys(months).sort();
  const years = new Set(keys.map((k) => k.slice(0, 4)));
  const rows = keys.map((k) => ({ label: MONTHS[Number(k.slice(5, 7)) - 1] + (years.size > 1 ? " '" + k.slice(2, 4) : ""), value: Math.round(months[k]) }));
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!rows.length) return <Empty pad>No revenue recorded yet.</Empty>;
  return (
    <div style={{ padding: "2px 4px 8px" }}>
      <div style={{ padding: "0 12px 4px" }}>
        <span style={{ fontFamily: FONT.display, fontSize: 26, fontWeight: 600 }}>{money(total)}</span>
        <span style={{ fontSize: 12.5, color: C.ink3, marginLeft: 8 }}>net, sessions + closed offers</span>
      </div>
      <ResponsiveContainer width="100%" height={208}>
        <AreaChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="sbRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.brand} stopOpacity={0.3} />
              <stop offset="100%" stopColor={C.brand} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={C.lineSoft} vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: C.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: C.ink3 }} axisLine={false} tickLine={false} width={46}
            tickFormatter={(v) => (v >= 1000 ? "$" + (v / 1000).toFixed(1) + "k" : "$" + v)} />
          <Tooltip formatter={(v) => [money(v), "Net revenue"]} cursor={{ stroke: C.line }}
            contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}
            labelStyle={{ color: C.ink2, fontWeight: 600 }} />
          <Area type="monotone" dataKey="value" stroke={C.brand} strokeWidth={1.5} fill="url(#sbRev)" dot={{ r: 3, fill: C.brand }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function SourceBreakdown({ data }) {
  const rows = SOURCE.map((s) => {
    const items = data.clients.filter((c) => c.source === s);
    return { name: s, value: items.length, ltv: items.reduce((a, c) => a + (Number(c.lifetimeValue) || 0), 0), color: SOURCE_COLOR[s] };
  }).filter((r) => r.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  if (!total) return <Empty pad>No clients yet.</Empty>;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 14px 12px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", width: 152, height: 152, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={50} outerRadius={72} paddingAngle={2} stroke="none">
              {rows.map((r) => <Cell key={r.name} fill={r.color} />)}
            </Pie>
            <Tooltip formatter={(v, n) => [v + (v === 1 ? " client" : " clients"), n]}
              contentStyle={{ borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 600, lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: C.ink3 }}>clients</div>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 168, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600 }}>
          <span style={{ width: 9, flexShrink: 0 }} /><span style={{ flex: 1 }}>Source</span><span>Clients</span><span style={{ width: 64, textAlign: "right" }}>LTV</span>
        </div>
        {[...rows].sort((a, b) => b.value - a.value).map((r) => (
          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 9, height: 9, borderRadius: 3, background: r.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>{r.name}</span>
            <span style={{ fontSize: 13.5, color: C.ink2 }}>{r.value}</span>
            <span style={{ fontSize: 12.5, color: C.ink3, width: 64, textAlign: "right" }}>{money(r.ltv)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   SECTION (per database, with views)
   ============================================================ */
function Section({ section, data, derived, today, view, setView, query, onOpen, currentUser, secUsers, masterKeyRaw, setSecUsers, setData, canEdit, setConfirm, crmSettings, saveCrmSettings }) {
  const cfg = VIEWS[section];
  const v = cfg.views[Math.min(view, cfg.views.length - 1)];
  let rows = data[section] || [];

  // search
  if (query.trim()) {
    const q = norm(query);
    if (section === "sessions") {
      // Build a map of sessionId → client names from registrations for richer search
      const sessionClientMap = {};
      (data?.registrations || []).forEach(reg => {
        if (reg.sessionId) {
          const client = (data?.clients || []).find(c => c.id === reg.clientId);
          if (client) (sessionClientMap[reg.sessionId] ||= []).push(norm(cleanName(client.name)));
        }
      });
      rows = rows.filter((r) => {
        if (Object.values(r).some((val) => norm(val).includes(q))) return true;
        const studioName = derived?.partnerName?.[r.studioId] ? norm(cleanName(derived.partnerName[r.studioId])) : "";
        if (studioName.includes(q)) return true;
        const clientNames = (sessionClientMap[r.id] || []).join(" ");
        if (clientNames.includes(q)) return true;
        return false;
      });
    } else {
      rows = rows.filter((r) => Object.values(r).some((val) => norm(val).includes(q)));
    }
  }
  const processed = v.run ? v.run(rows, { data, derived, today }) : { rows };

  const handleImportExpenses = !canEdit ? null : (file) => {
    if (file.size > 10 * 1024 * 1024) { alert("CSV file must be under 10 MB."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const spec = IMPORT_MAP.expenses;
        const rows = res.data.map((raw) => {
          const rec = { id: uid("exp") };
          const lower = {};
          Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
          Object.entries(spec.map).forEach(([csvKey, field]) => {
            let val = lower[csvKey] ?? "";
            val = Sec.sanitize(val);
            if (spec.nums && spec.nums.includes(field)) val = num(val);
            rec[field] = val;
          });
          return rec;
        }).filter((r) => r.date || r.vendor || r.amount);
        if (rows.length > 0) {
          setData((d) => ({ ...d, expenses: [...(d.expenses || []), ...rows] }));
          alert(`Imported ${rows.length} expense record${rows.length !== 1 ? "s" : ""} successfully.`);
        } else {
          alert("No valid rows found. Check that your CSV headers match the required format.");
        }
      },
    });
  };

  return (
    <div>
      <div className="sb-tabs">
        {cfg.views.map((vv, i) => (
          <button key={vv.name} className={"sb-tab" + (i === view ? " sb-tab-on" : "")} onClick={() => setView(i)}>{vv.name}</button>
        ))}
      </div>
      {v.layout === "board"
        ? <BoardView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} cardKeys={v.card} ctx={{ data, derived, today }} section={section} />
        : v.layout === "partner-pipeline"
        ? <PartnerPipelineView groups={processed.groups} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "session-perf"
        ? <SessionPerfView rows={processed.rows} derived={derived} onOpen={(r) => onOpen({ db: section, record: r })} />
        : v.layout === "offer-analytics"
        ? <OfferConversionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "offers", record: r })} />
        : v.layout === "revenue-analytics"
        ? <RevenueAttributionView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "revenue", record: r })} />
        : v.layout === "referral-tree"
        ? <ReferralTreeView data={data} derived={derived} today={today} onOpen={(r) => onOpen({ db: "referrals", record: r })} />
        : v.layout === "content-analytics"
        ? <ContentAnalyticsView data={data} onOpen={onOpen} />
        : v.layout === "testimonial-library"
        ? <TestimonialLibraryView data={data} onOpen={onOpen} />
        : v.layout === "template-library"
        ? <TemplateLibraryView data={data} setData={setData} onOpen={onOpen} currentUser={currentUser} />
        : v.layout === "workflows"
        ? <WorkflowsView data={data} derived={derived} today={today} />
        : v.layout === "user-management"
        ? <UserManagementView currentUser={currentUser} secUsers={secUsers} masterKeyRaw={masterKeyRaw} onUsersUpdated={setSecUsers} onConfirm={setConfirm} />
        : v.layout === "admin-overview"   ? <AdminView tab="overview"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-schema"     ? <AdminView tab="schema"     data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-integrity"  ? <AdminView tab="integrity"  data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-storage"    ? <AdminView tab="storage"    data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-settings"   ? <AdminView tab="settings"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-journeys"   ? <AdminView tab="journeys"   data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-email-logs"  ? <AdminView tab="email-logs" data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "admin-reset"      ? <AdminView tab="reset"      data={data} setData={setData} secUsers={secUsers} currentUser={currentUser} today={today} crmSettings={crmSettings} onSaveSettings={saveCrmSettings} />
        : v.layout === "expense-summary"  ? <ExpenseSummaryView data={data} today={today} canEdit={canEdit} onOpen={(r) => onOpen({ db: "expenses", record: r })} onImportExpenses={handleImportExpenses} />
        : v.layout === "outreach-hub"
        ? <OutreachHubView rows={processed.rows} data={data} today={today} onOpen={(r) => onOpen({ db: "outreach", record: r })} />
        : v.layout === "calendar"
        ? <CalendarView rows={processed.rows} today={today} derived={derived} data={data} onOpen={(r) => onOpen({ db: section, record: r })} />
        : <TableView columns={v.columns} rows={processed.rows} footer={processed.footer} onOpen={(r) => onOpen({ db: section, record: r })} ctx={{ data, derived, today, setData, section }} />}
    </div>
  );
}

/* ---------- View configs ---------- */
const col = (key, label, render, opts = {}) => ({ key, label, render, ...opts });

function TagList({ tags, max = 3 }) {
  if (!tags || !tags.length) return null;
  const shown = tags.slice(0, max);
  const rest = tags.length - max;
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
      {shown.map(t => (
        <span key={t} style={{
          fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
          background: hexA(TAG_COLOR[t] || C.ink3, 0.13),
          color: TAG_COLOR[t] || C.ink3, whiteSpace: "nowrap",
        }}>{t}</span>
      ))}
      {rest > 0 && <span style={{ fontSize: 11, color: C.ink3 }}>+{rest}</span>}
    </div>
  );
}

const clientCell = {
  name: (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>,
  status: (r) => <Tag color={STATUS_COLOR[r.status]}>{r.status}</Tag>,
  type: (r) => r.clientType ? <Tag color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3} soft>{r.clientType}</Tag> : null,
  tags: (r) => <TagList tags={r.tags} />,
};

const VIEWS = {
  workflows: {
    views: [{ name: "All workflows", layout: "workflows" }],
  },
  users: {
    views: [{ name: "Users & Permissions", layout: "user-management" }],
  },
  admin: {
    views: [
      { name: "Overview",        layout: "admin-overview" },
      { name: "Settings",        layout: "admin-settings" },
      { name: "Journey Descriptions", layout: "admin-journeys" },
      { name: "Schema Browser",  layout: "admin-schema" },
      { name: "Data Integrity",  layout: "admin-integrity" },
      { name: "Storage & Backup", layout: "admin-storage" },
      { name: "Email Logs", layout: "admin-email-logs" },
      { name: "Reset to Production", layout: "admin-reset" },
    ],
  },
  expenses: {
    views: [
      { name: "Summary",        layout: "expense-summary" },
      {
        name: "All Expenses", layout: "table",
        columns: [
          col("date",          "Date",        r => r.date),
          col("vendor",        "Vendor",      r => <strong style={{color:C.ink}}>{r.vendor}</strong>),
          col("description",   "Description", r => r.description),
          col("category",      "Category",    r => <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,0.12),color:EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,fontWeight:600}}>{r.category}</span>),
          col("amount",        "Amount",      r => <strong style={{color:C.ink}}>{money(r.amount)}</strong>, {align:"right"}),
          col("paymentMethod", "Payment",     r => r.paymentMethod),
          col("taxDeductible", "Tax Ded.",    r => r.taxDeductible ? <span style={{color:"#16A34A",fontWeight:700}}>✓ Yes</span> : <span style={{color:C.ink3}}>No</span>),
          col("recurring",     "Recurring",   r => r.recurring ? <span style={{fontSize:11,padding:"2px 7px",borderRadius:8,background:C.brandSoft,color:C.brandDeep,fontWeight:600}}>{r.recurringFreq}</span> : ""),
        ],
        run: (rows) => ({
          rows: [...rows].sort((a,b) => (b.date||"").localeCompare(a.date||"")),
          footer: { amount: rows.reduce((s,r)=>s+(+r.amount||0),0) },
        }),
      },
      {
        name: "By Category", layout: "table",
        columns: [
          col("category",  "Category",      r => <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,0.12),color:EXPENSE_CATEGORY_COLOR[r.category]||C.ink3,fontWeight:600}}>{r.category}</span>),
          col("vendor",    "Vendor",        r => r.vendor),
          col("date",      "Date",          r => r.date),
          col("amount",    "Amount",        r => money(r.amount), {align:"right"}),
          col("notes",     "Notes",         r => r.notes),
        ],
        run: (rows) => ({
          rows: [...rows].sort((a,b)=>(a.category||"").localeCompare(b.category||"")),
          footer: { amount: rows.reduce((s,r)=>s+(+r.amount||0),0) },
        }),
      },
      {
        name: "Recurring", layout: "table",
        columns: [
          col("vendor",        "Vendor",      r => <strong style={{color:C.ink}}>{r.vendor}</strong>),
          col("description",   "Description", r => r.description),
          col("category",      "Category",    r => r.category),
          col("amount",        "Amount",      r => money(r.amount), {align:"right"}),
          col("recurringFreq", "Frequency",   r => r.recurringFreq),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.recurring);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
      {
        name: "Tax Deductible", layout: "table",
        columns: [
          col("date",        "Date",        r => r.date),
          col("vendor",      "Vendor",      r => r.vendor),
          col("description", "Description", r => r.description),
          col("category",    "Category",    r => r.category),
          col("amount",      "Amount",      r => money(r.amount), {align:"right"}),
        ],
        run: (rows) => {
          const filtered = rows.filter(r => r.taxDeductible);
          return { rows: filtered, footer: { amount: filtered.reduce((s,r)=>s+(+r.amount||0),0) } };
        },
      },
    ],
  },
  registrations: {
    views: [
      {
        name: "All Bookings", layout: "table",
        columns: [
          col("scheduledAt", "Session Date/Time", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return c ? <strong style={{color:C.ink}}>{cleanName(c.name)}</strong> : <span style={{color:C.ink3}}>—</span>; }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Status",       r => {
            const clr = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" }[r.status] || C.ink3;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("paymentStatus","Payment",     r => {
            const clr = { paid: "#4A8C6F", unpaid: "#C0573F", unknown: C.ink3 }[r.paymentStatus] || C.ink3;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.paymentStatus}</span>;
          }),
          col("waiverStatus", "Waiver",      r => r.waiverStatus === "signed"
            ? <span style={{color:"#4A8C6F",fontWeight:700}}>✓ Signed</span>
            : <span style={{color:C.ink3}}>Pending</span>),
          col("attendanceType","Attendance", r => r.attendanceType || "—"),
          col("locationType", "Location",   r => r.locationType || "—"),
          col("howHeard",     "How Heard",  r => r.howHeard || "—"),
        ],
        run: (rows) => ({ rows: [...rows].sort((a,b) => (b.scheduledAt||"").localeCompare(a.scheduledAt||"")) }),
      },
      {
        name: "Pending Waivers", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Status",       r => r.status),
          col("waiverStatus","Waiver",       r => <span style={{color:"#C0573F",fontWeight:600}}>⚠ Pending</span>),
          col("concerns",    "Concerns",     r => r.concerns || "—"),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled") }),
      },
      {
        name: "Unpaid", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Booking",      r => r.status),
          col("paymentStatus","Payment",     r => <span style={{color:"#C0573F",fontWeight:700}}>Unpaid</span>),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.paymentStatus === "unpaid" && r.status !== "canceled") }),
      },
      {
        name: "Cancellations", layout: "table",
        columns: [
          col("scheduledAt", "Session Date", r => r.scheduledAt ? new Date(r.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"),
          col("clientId",    "Client",       (r, ctx) => { const c = (ctx.data.clients||[]).find(x => x.id === r.clientId); return cleanName(c?.name || "—"); }),
          col("eventName",   "Event",        r => r.eventName || "—"),
          col("status",      "Status",       r => {
            const clr = r.status === "canceled" ? "#C0573F" : C.gold;
            return <span style={{fontSize:12,padding:"2px 8px",borderRadius:8,background:hexA(clr,0.12),color:clr,fontWeight:600}}>{r.status}</span>;
          }),
          col("howHeard",    "How Heard",    r => r.howHeard || "—"),
          col("referredBy",  "Referred By",  r => r.referredBy || "—"),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.status === "canceled" || r.status === "rescheduled").sort((a,b) => (b.scheduledAt||"").localeCompare(a.scheduledAt||"")) }),
      },
    ],
  },
  clients: {
    views: [
      { name: "All clients", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("source", "Source", (r) => r.source),
          col("tags", "Intent", clientCell.tags),
          col("referral", "Referral", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("lifetimeValue", "LTV", (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "board", card: ["clientType", "tags", "nextSession", "packageType", "referral"],
        run: (rows) => ({ groups: STATUS.map((s) => ({ key: s, label: s, color: STATUS_COLOR[s], cards: rows.filter((r) => r.status === s) })) }) },
      { name: "By segment", layout: "table",
        columns: [
          col("name",        "Client",   clientCell.name),
          col("clientType",  "Segment",  clientCell.type),
          col("tags",        "Intent",   clientCell.tags),
          col("status",      "Status",   clientCell.status),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",    (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.clientType || "").localeCompare(b.clientType || "")) }) },
      { name: "Reactivation list", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("clientType","Segment",   clientCell.type),
          col("tags",      "Intent",    clientCell.tags),
          col("lastSession","Last seen", (r) => fmtDate(r.lastSession)),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
          col("notes",     "Notes",     (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
        ],
        run: (rows, c) => ({
          rows: rows.filter(r =>
            r.clientType === "Past client — reactivate" ||
            (r.lastSession && r.lastSession < addDays(c.today, -30))
          ).sort((a, b) => (a.lastSession || "").localeCompare(b.lastSession || ""))
        }) },
      { name: "Advocates & referrers", layout: "table",
        columns: [
          col("name",      "Client",    clientCell.name),
          col("status",    "Status",    clientCell.status),
          col("tags",      "Intent",    clientCell.tags),
          col("referral",  "Referral potential", (r) => <Tag color={REFERRAL_COLOR[r.referral]} soft>{r.referral}</Tag>),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "LTV",   (r) => money(r.lifetimeValue), { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter(r => r.referral === "High" || r.status === "Advocate" || r.clientType === "Referral source" || r.clientType === "Advocate").sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
      { name: "Sessions due / overdue", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("nextSession", "Next session", (r, c) => <DateChip iso={r.nextSession} today={c.today} />),
          col("phone", "Phone", (r) => <span style={{ color: C.ink2 }}>{r.phone}</span>),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => onOrBefore(r.nextSession, c.today)).sort((a, b) => (a.nextSession || "").localeCompare(b.nextSession || "")) }) },
      { name: "High value", layout: "table",
        columns: [
          col("name", "Client", clientCell.name),
          col("status", "Status", clientCell.status),
          col("clientType", "Segment", clientCell.type),
          col("packageType", "Package", (r) => r.packageType),
          col("sessionsAttended", "Sessions", (r) => r.sessionsAttended, { align: "right" }),
          col("lifetimeValue", "Lifetime value", (r) => <strong>{money(r.lifetimeValue)}</strong>, { align: "right" }),
        ],
        run: (rows) => ({ rows: rows.filter((r) => Number(r.lifetimeValue) > 0).sort((a, b) => Number(b.lifetimeValue) - Number(a.lifetimeValue)) }) },
    ],
  },
  partners: {
    views: [
      { name: "Active partners", layout: "table",
        columns: partnerCols(),
        run: (rows) => ({ rows: rows.filter((r) => r.stage === "Recurring partner" || r.stage === "First session scheduled" || r.stage === "Pilot completed").sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
      { name: "Pipeline", layout: "partner-pipeline",
        run: (rows) => ({ groups: STAGE.map((s) => ({ key: s, label: s, color: STAGE_COLOR[s], cards: rows.filter((r) => r.stage === s) })) }) },
      { name: "In outreach", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("contact", "Contact", (r) => r.contact),
          col("lastTouch", "Last touch", (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => ({ rows: rows.filter((r) => !["Recurring partner", "Lost / not a fit"].includes(r.stage)).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "Revenue forecast", layout: "table",
        columns: [
          col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
          col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("estimatedCommunitySize", "Community", (r) => Number(r.estimatedCommunitySize || 0).toLocaleString(), { align: "right" }),
          col("revenuePotential", "Rev. potential", (r) => <strong>{money(r.revenuePotential)}</strong>, { align: "right", sum: "revenuePotential" }),
          col("closeProbability", "Probability", (r) => r.closeProbability ? <Tag color={CLOSE_PROB_COLOR[r.closeProbability]} soft>{r.closeProbability}</Tag> : "—"),
        ],
        run: (rows) => {
          const sorted = [...rows].filter((r) => r.stage !== "Lost / not a fit").sort((a, b) => Number(b.revenuePotential) - Number(a.revenuePotential));
          return { rows: sorted, footer: { revenuePotential: money(sum(sorted, "revenuePotential")), label: "Total pipeline value" } };
        } },
      { name: "All partners", layout: "table",
        columns: [
          col("name",      "Studio",        (r) => <span style={{ fontWeight: 700 }}>{cleanName(r.name)}</span>),
          col("studioType","Type",          (r) => fmtStudioType(r.studioType)),
          col("stage",     "Stage",         (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
          col("location",  "Address",       (r) => r.location || "—"),
          col("contact",   "Contact",       (r) => r.contact || "—"),
          col("phone",     "Phone",         (r) => r.phone ? <a href={`tel:${r.phone}`} style={{ color: C.brand }}>{r.phone}</a> : "—"),
          col("email",     "Email",         (r) => r.email ? <a href={`mailto:${r.email}`} style={{ color: C.brand }}>{r.email}</a> : "—"),
          col("revShare",  "Rev share",     (r) => r.revShare || "—"),
          col("contractStatus", "Contract", (r) => r.contractStatus ? <Tag color={r.contractStatus === "Signed" ? "#4A8C6F" : C.gold} soft>{r.contractStatus}</Tag> : "—"),
          col("lastTouch", "Last touch",    (r, c) => <DateChip iso={r.lastTouch} today={c.today} />),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => (a.name || "").toLowerCase().localeCompare((b.name || "").toLowerCase())) }) },
    ],
  },
  sessions: {
    views: [
      { name: "Calendar", layout: "calendar", run: (rows) => ({ rows }) },
      { name: "Performance", layout: "session-perf", run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
      { name: "Revenue leaderboard", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("studioId", "Studio", (r, c) => clientShort(c.derived.partnerName[r.studioId] || "—")),
          col("date", "Date", (r) => fmtDate(r.date)),
          col("status", "Status", (r) => <Tag color={SESSION_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("attendance", "In room", (r) => `${r.attendance || 0}/${r.capacity || "?"}`, { align: "right" }),
          col("revenue", "Gross", (r) => money(r.revenue), { align: "right" }),
          col("studioSplit", "Studio cut", (r) => money(r.studioSplit), { align: "right" }),
          col("netRevenue", "Your net", (r) => <strong>{money(r.netRevenue)}</strong>, { align: "right", sum: "netRevenue" }),
        ],
        run: (rows) => {
          const sorted = [...rows].sort((a, b) => Number(b.netRevenue) - Number(a.netRevenue));
          return { rows: sorted, footer: { revenue: money(sum(sorted, "revenue")), netRevenue: money(sum(sorted, "netRevenue")), label: "All-time total" } };
        } },
      { name: "Conversion", layout: "table",
        columns: [
          col("name", "Session", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("attendance", "In room", (r) => r.attendance, { align: "right" }),
          col("paidAttendees", "Paid", (r) => r.paidAttendees || "—", { align: "right" }),
          col("waivers", "Waivers", (r) => r.waivers || "—", { align: "right" }),
          col("packagesSold", "Packages", (r) => r.packagesSold, { align: "right" }),
          col("testimonialsCapt", "Testimonials", (r) => r.testimonialsCapt || 0, { align: "right" }),
          col("referralsGenerated", "Referrals", (r) => r.referralsGenerated, { align: "right" }),
          col("conversion", "Conversion", (r) => <Tag color={r.conversion >= 0.3 ? "#2F6FD0" : r.conversion >= 0.2 ? "#3F87DC" : "#9FB2CC"} soft>{pct(r.conversion)}</Tag>, { align: "right" }),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => Number(b.conversion) - Number(a.conversion)) }) },
    ],
  },
  offers: {
    views: [
      { name: "Open pipeline", layout: "table",
        columns: offerCols(),
        run: (rows) => ({ rows: rows.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => (a.expireDate || "9999").localeCompare(b.expireDate || "9999")) }) },
      { name: "Conversion analytics", layout: "offer-analytics" },
      { name: "By offer type", layout: "table",
        columns: [
          col("offerType", "Type", (r) => r.offerType),
          col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
          col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
          col("source", "Source", (r) => r.source || "—"),
          col("notes", "Notes", (r) => <span style={{ color: C.ink2, fontSize: 12 }}>{r.notes}</span>),
        ],
        run: (rows) => ({ rows: [...rows].sort((a, b) => a.offerType.localeCompare(b.offerType)) }) },
      { name: "Won this month", layout: "table",
        columns: offerCols(),
        run: (rows, c) => {
          const r = rows.filter((x) => WON_STATUSES.includes(x.status) && sameMonth(x.dateOffered, c.today));
          return { rows: r, footer: { price: money(sum(r, "price")), label: "Closed this month" } };
        } },
      { name: "All offers", layout: "table", columns: offerCols(), run: (rows) => ({ rows }) },
    ],
  },
  revenue: {
    views: [
      { name: "Revenue attribution", layout: "revenue-analytics" },
      { name: "This month", layout: "table", columns: revCols(),
        run: (rows, c) => {
          const r = [...rows].filter(x => sameMonth(x.date, c.today)).sort((a, b) => b.date.localeCompare(a.date));
          const netTotal = r.reduce((s, row) => s + calcNet(row), 0);
          return { rows: r, footer: { gross: money(sum(r, "gross")), net: money(netTotal), label: "Gross this month" } };
        } },
      { name: "All transactions", layout: "table", columns: revCols(),
        run: (rows) => {
          const r = [...rows].sort((a, b) => b.date.localeCompare(a.date));
          const netTotal = r.reduce((s, row) => s + calcNet(row), 0);
          return { rows: r, footer: { gross: money(sum(r, "gross")), net: money(netTotal), label: "Total gross" } };
        } },
    ],
  },
  content: {
    views: [
      { name: "Pipeline",
        layout: "board",
        card: ["category", "platform", "scheduledDate", "leads", "booked"],
        run: (rows) => ({
          groups: ["Idea","Draft","Scheduled","Published"].map(s => ({
            key: s, label: s, color: CONTENT_STATUS_COLOR[s],
            cards: rows.filter(r => r.status === s),
          })),
        }) },
      { name: "Analytics", layout: "content-analytics" },
      { name: "Calendar",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status !== "Archived")
            .sort((a, b) => (a.scheduledDate || a.datePosted || "9999").localeCompare(b.scheduledDate || b.datePosted || "9999")),
        }) },
      { name: "Top performers",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: [...rows]
            .filter(r => r.status === "Published")
            .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0) || (Number(b.leads) || 0) - (Number(a.leads) || 0)),
          footer: {
            revenue: money(rows.filter(r=>r.status==="Published").reduce((a,r)=>a+(Number(r.revenue)||0),0)),
            label: "Total attributed revenue",
          },
        }) },
      { name: "Ideas & drafts",
        layout: "table",
        columns: contentCols(),
        run: (rows) => ({
          rows: rows.filter(r => ["Idea","Draft"].includes(r.status))
            .sort((a, b) => (a.scheduledDate || "9999").localeCompare(b.scheduledDate || "9999")),
        }) },
    ],
  },
  followups: {
    views: [
      { name: "Due today", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r, c) => <DateChip iso={r.nextAction} today={c.today} />),
          col("_send",      "",            (r, c) => <FollowUpSendButton r={r} data={c.data} setData={c.setData} today={c.today} />),
        ],
        run: (rows, c) => ({ rows: rows.filter((r) => r.nextAction && r.nextAction <= c.today).sort((a, b) => (a.nextAction || "").localeCompare(b.nextAction || "")) }) },
      { name: "All follow-ups", layout: "table",
        columns: [
          col("name",       "Follow-up",   (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",      (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("futype",     "Type",        (r) => <Tag color={FUTYPE_COLOR[r.futype]} soft>{r.futype}</Tag>),
          col("nextAction", "Next action", (r) => fmtDate(r.nextAction)),
          col("outcome",    "Outcome",     (r) => r.outcome ? <span style={{ color: C.brand }}>{r.outcome}</span> : <span style={{ color: C.ink3 }}>pending</span>),
          col("_send",      "",            (r, c) => <FollowUpSendButton r={r} data={c.data} setData={c.setData} today={c.today} />),
        ],
        run: (rows) => ({ rows }) },
      { name: "By type", layout: "board", card: ["clientId", "nextAction", "outcome"],
        run: (rows) => ({ groups: FUTYPE.map((t) => ({ key: t, label: t, color: FUTYPE_COLOR[t], cards: rows.filter((r) => r.futype === t) })) }) },
    ],
  },
  testimonials: {
    views: [
      { name: "Library", layout: "testimonial-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",       "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId",   "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",     "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("type",       "Type",         (r) => r.type),
          col("themes",     "Themes",       (r) => <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>{(r.themes||[]).slice(0,2).map(t=><Tag key={t} soft>{t}</Tag>)}</div>),
          col("useOnWebsite","Web",         (r) => r.useOnWebsite ? <span style={{ color:"#4A8C6F" }}>✓</span> : "—", { align:"center" }),
          col("useOnSocial", "Social",      (r) => r.useOnSocial  ? <span style={{ color:"#6B5CE7" }}>✓</span> : "—", { align:"center" }),
          col("datePublished","Published",  (r) => fmtDate(r.datePublished)),
        ],
        run: (rows) => ({ rows: [...rows].sort((a,b) => {
          const ord = { Published:0, Approved:1, Received:2, "Request sent":3, "Breakthrough noted":4, Declined:5 };
          return (ord[a.status]??9) - (ord[b.status]??9);
        }) }) },
      { name: "Action needed", layout: "table",
        columns: [
          col("name",     "Testimonial",  (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
          col("clientId", "Client",       (r, c) => clientShort(c.derived.clientName[r.clientId] || "—")),
          col("status",   "Status",       (r) => <Tag color={TESTIMONIAL_STATUS_COLOR[r.status]} soft>{r.status}</Tag>),
          col("notes",    "Notes",        (r) => r.notes),
        ],
        run: (rows) => ({ rows: rows.filter(r => ["Breakthrough noted","Request sent"].includes(r.status)) }) },
      { name: "By theme", layout: "board",
        card: ["clientId","status","bestQuote"],
        run: (rows) => ({
          groups: TESTIMONIAL_THEMES.map(th => ({
            key: th, label: th, color: "#6B5CE7",
            cards: rows.filter(r => (r.themes||[]).includes(th)),
          })).filter(g => g.cards.length > 0),
        }) },
    ],
  },
  templates: {
    views: [
      { name: "Library", layout: "template-library" },
      { name: "All", layout: "table",
        columns: [
          col("name",     "Template",  r => <span style={{ fontWeight: 600 }}>{r.name}</span>),
          col("category", "Category",  r => <Tag color={TMPL_CATEGORY_COLOR[r.category]||C.ink3} soft>{r.category}</Tag>),
          col("channel",  "Channel",   r => <Tag color={TMPL_CHANNEL_COLOR[r.channel]||C.ink3} soft>{r.channel}</Tag>),
          col("subject",  "Subject",   r => <span style={{ fontSize: 12, color: C.ink2 }}>{r.subject||"—"}</span>),
          col("usageCount","Used", r => r.usageCount || 0),
        ],
        run: (rows) => ({ rows }),
      },
    ],
  },
  referrals: {
    views: [
      { name: "Referral tree", layout: "referral-tree" },
      { name: "Action needed", layout: "table",
        columns: refActionCols(),
        run: (rows, c) => ({
          rows: rows.filter(r => !r.rewardGiven)
                    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        }) },
      { name: "All referrals", layout: "table", columns: refCols(), run: (rows) => ({ rows: [...rows].sort((a, b) => b.date.localeCompare(a.date)) }) },
    ],
  },
  outreach: {
    views: [
      { name: "All targets",        layout: "outreach-hub",
        run: (rows) => ({ rows }) },
      { name: "Hot leads",          layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r => r.warmth === "Hot") }) },
      { name: "Overdue",            layout: "outreach-hub",
        run: (rows, { today }) => ({ rows: rows.filter(r =>
          r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status)
        )}) },
      { name: "No response",        layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => ["No response","Ghosted"].includes(r.responseStatus)) }) },
      { name: "Demo stage",          layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => ["Demo offered","Demo scheduled"].includes(r.status)) }) },
      { name: "Agreement pending",   layout: "outreach-hub",
        run: (rows) => ({ rows: rows.filter(r => r.status === "Agreement pending") }) },
      { name: "High potential",      layout: "outreach-hub",
        run: (rows) => ({ rows: [...rows].filter(r => Number(r.revenuePotential) >= 1000).sort((a,b) => Number(b.revenuePotential) - Number(a.revenuePotential)) }) },
    ],
  },
};

function partnerCols() {
  return [
    col("name", "Studio", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("studioType", "Type", (r) => fmtStudioType(r.studioType)),
    col("location", "Location", (r) => <span style={{ color: C.ink2 }}>{r.location}</span>),
    col("contact", "Contact", (r) => `${r.contact} · ${r.role}`),
    col("stage", "Stage", (r) => <Tag color={STAGE_COLOR[r.stage]} soft>{r.stage}</Tag>),
    col("avgAttendance", "Avg att.", (r) => r.avgAttendance || "—", { align: "right" }),
    col("sessionsPerMonth", "Sess/mo", (r) => r.sessionsPerMonth || "—", { align: "right" }),
    col("revenuePotential", "Rev. potential", (r) => money(r.revenuePotential), { align: "right" }),
  ];
}
function offerCols() {
  return [
    col("clientId", "Client / Studio", (r, c) => <span style={{ fontWeight: 600 }}>{clientShort(c.derived.clientName[r.clientId] || cleanName(r.name))}</span>),
    col("offerType", "Type", (r) => r.offerType),
    col("price", "Amount", (r) => money(r.price), { align: "right", sum: "price" }),
    col("status", "Status", (r) => <Tag color={OFFER_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("probability", "Prob.", (r) => r.probability || "—", { align: "right" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
    col("dateOffered", "Offered", (r) => fmtDate(r.dateOffered)),
    col("expireDate", "Expires", (r, c) => <DateChip iso={r.expireDate} today={c.today} />),
    col("followUpDate", "Follow-up", (r, c) => <DateChip iso={r.followUpDate} today={c.today} />),
  ];
}
function refCols() {
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("revenue", "Revenue", (r) => r.revenue ? <strong style={{ color: "#4A8C6F" }}>{money(r.revenue)}</strong> : "—", { align: "right" }),
    col("thankYouSent", "Thank-you", (r) => r.thankYouSent
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Sent</span>
      : <span style={{ color: "#D9892B", fontWeight: 600 }}>Needed</span>),
    col("rewardGiven", "Action Status", (r) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F", fontWeight: 600 }}>✓ Completed</span>
      : <span style={{ color: C.ink3 }}>Pending</span>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}

function refActionCols() {
  const updateRef = (c, r, patch) => {
    if (!c.setData) return;
    c.setData(d => ({
      ...d,
      referrals: d.referrals.map(x => x.id === r.id ? { ...x, ...patch } : x),
    }));
  };
  return [
    col("referrerId", "Referred by", (r, c) => {
      const n = c.derived.clientName[r.referrerId];
      return n ? <span style={{ fontWeight: 600 }}>{clientShort(n)}</span> : "—";
    }),
    col("referredName", "Referred person", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.referredName)}</span>),
    col("status", "Status", (r) => <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>),
    col("date", "Date", (r, c) => <DateChip iso={r.date} today={c.today} />),
    col("rewardGiven", "Action Status", (r, c) => r.rewardGiven
      ? <span style={{ color: "#4A8C6F" }}>✓ Completed</span>
      : <button
          onClick={e => { e.stopPropagation(); updateRef(c, r, { rewardGiven: true }); }}
          style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
            background: hexA("#4A8C6F", 0.1), color: "#4A8C6F", border: `1px solid ${hexA("#4A8C6F", 0.3)}` }}>
          Mark Completed
        </button>),
    col("notes", "Notes", (r) => <span style={{ fontSize: 12, color: C.ink2 }}>{r.notes}</span>),
  ];
}
function revCols() {
  return [
    col("name", "Description", (r) => <span style={{ fontWeight: 600 }}>{cleanName(r.name)}</span>),
    col("date", "Date", (r) => fmtDate(r.date)),
    col("channel", "Channel", (r) => <Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag>),
    col("gross", "Gross", (r) => money(r.gross), { align: "right", sum: "gross" }),
    col("studioSplit", "Studio split", (r) => r.studioSplit ? money(r.studioSplit) : "—", { align: "right" }),
    col("stripeFee", "Processing", (r) => r.stripeFee ? money(r.stripeFee) : "—", { align: "right" }),
    col("facilitatorCost", "Facilitator", (r) => r.facilitatorCost ? money(r.facilitatorCost) : "—", { align: "right" }),
    col("refunds", "Refunds", (r) => r.refunds ? <span style={{ color: "#C0573F" }}>-{money(r.refunds)}</span> : "—", { align: "right" }),
    col("net", "Net", (r) => {
      const n = calcNet(r);
      return <strong style={{ color: n > 0 ? "#4A8C6F" : n < 0 ? "#C0573F" : C.ink3 }}>{money(n)}</strong>;
    }, { align: "right", sum: "net" }),
    col("source", "Source", (r) => r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"),
  ];
}
function contentCols() {
  return [
    col("name",      "Title",    (r) => (
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{cleanName(r.name)}</div>
        {r.body && <div style={{ fontSize: 11, color: C.ink3, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{r.body}</div>}
      </div>
    )),
    col("category",  "Category",  (r) => <Tag color={CONTENT_CAT_COLOR[r.category] || C.ink3} soft>{r.category}</Tag>),
    col("status",    "Status",    (r) => <Tag color={CONTENT_STATUS_COLOR[r.status] || C.ink3} soft>{r.status}</Tag>),
    col("platform",  "Platform",  (r) => <Tag color={PLATFORM_COLOR[r.platform] || C.ink3} soft>{r.platform}</Tag>),
    col("scheduledDate","Date",   (r) => <DateChip iso={r.datePosted || r.scheduledDate} />),
    col("reach",     "Reach",     (r) => (Number(r.reach) || 0).toLocaleString(), { align: "right" }),
    col("leads",     "Leads",     (r) => Number(r.leads) || 0, { align: "right" }),
    col("booked",    "Booked",    (r) => <strong style={{ color: C.brand }}>{Number(r.booked) || 0}</strong>, { align: "right" }),
    col("revenue",   "Revenue",   (r) => money(r.revenue), { align: "right" }),
  ];
}
const sum = (rows, k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);

/* ============================================================
   TABLE
   ============================================================ */
function TableView({ columns, rows, footer, onOpen, ctx }) {
  if (!rows.length) return <Empty pad>Nothing here yet. Add a record, or adjust the view.</Empty>;
  return (
    <div className="sb-card" style={{ overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="sb-table">
          <thead><tr>{columns.map((c) => <th key={c.key} style={{ textAlign: c.align || "left" }}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => onOpen(r)} className="sb-trow">
                {columns.map((c) => <td key={c.key} style={{ textAlign: c.align || "left" }}>{c.render(r, ctx)}</td>)}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot><tr>
              {columns.map((c, i) => (
                <td key={c.key} style={{ textAlign: c.align || "left" }}>
                  {i === 0 ? <span style={{ color: C.ink3, fontSize: 12 }}>{footer.label} · {rows.length}</span> : (footer[c.sum] != null ? <strong>{footer[c.sum]}</strong> : "")}
                </td>
              ))}
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   PARTNER PIPELINE (14-stage horizontal kanban)
   ============================================================ */
const STAGE_GROUPS = [
  { label: "Prospecting", stages: ["Target identified", "Researched", "Initial outreach sent", "Follow-up needed"], color: "#8AAFD0" },
  { label: "Qualifying", stages: ["Discovery call booked", "Demo session offered", "Demo completed"], color: "#4A90D9" },
  { label: "Closing", stages: ["Pilot proposed", "Agreement sent", "Agreement signed", "First session scheduled"], color: C.brand },
  { label: "Active", stages: ["Pilot completed", "Recurring partner"], color: C.brandDeep },
  { label: "Closed Lost", stages: ["Lost / not a fit"], color: "#9FB2CC" },
];

function PartnerPipelineView({ groups, onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Phase headers */}
      <div style={{ display: "flex", gap: 0, marginBottom: 0, overflowX: "auto", paddingBottom: 0 }}>
        {STAGE_GROUPS.map((ph) => (
          <div key={ph.label} style={{
            minWidth: ph.stages.length * 200, flex: `${ph.stages.length} 0 ${ph.stages.length * 200}px`,
            background: hexA(ph.color, 0.12), border: `1px solid ${hexA(ph.color, 0.3)}`,
            borderRadius: "10px 10px 0 0", padding: "8px 14px", marginRight: 2,
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: ph.color }}>
              {ph.label}
            </span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 16, alignItems: "flex-start" }}>
        {groups.map((g) => {
          const totalPotential = g.cards.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
          return (
            <div key={g.key} style={{ minWidth: 198, width: 198, flexShrink: 0, display: "flex", flexDirection: "column" }}>
              {/* Column head */}
              <div style={{
                padding: "10px 10px 8px",
                background: hexA(g.color, 0.08),
                borderLeft: `3px solid ${g.color}`,
                borderBottom: `1px solid ${C.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: g.color === "#9FB2CC" ? C.ink3 : g.color }}>{g.label}</span>
                  <span style={{ fontSize: 11, color: C.ink3, fontWeight: 600, background: C.surface, padding: "1px 6px", borderRadius: 10 }}>{g.cards.length}</span>
                </div>
                {totalPotential > 0 && (
                  <div style={{ fontSize: 10.5, color: C.ink3 }}>{money(totalPotential)} potential</div>
                )}
              </div>

              {/* Cards */}
              <div style={{ padding: "8px 4px", display: "flex", flexDirection: "column", gap: 6, minHeight: 60 }}>
                {g.cards.length === 0
                  ? <div style={{ border: `1px dashed ${C.line}`, borderRadius: 8, padding: "10px 8px", textAlign: "center", color: C.ink3, fontSize: 12 }}>—</div>
                  : g.cards.map((r) => (
                    <button key={r.id} onClick={() => onOpen(r)} style={{
                      width: "100%", textAlign: "left", background: C.surface,
                      border: `1px solid ${C.line}`, borderLeft: `3px solid ${g.color}`,
                      borderRadius: 9, padding: "10px 10px 8px", cursor: "pointer",
                      transition: "box-shadow .12s, transform .12s",
                    }}
                      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 4px 14px ${hexA(C.brandDeep, 0.1)}`; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 4, lineHeight: 1.3 }}>{cleanName(r.name)}</div>
                      {r.studioType && <div style={{ fontSize: 11, color: C.ink3, marginBottom: 4 }}>{fmtStudioType(r.studioType)}{r.location ? ` · ${r.location.split(",")[0]}` : ""}</div>}
                      {r.contact && <div style={{ fontSize: 11.5, color: C.ink2 }}>{r.contact}</div>}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
                        {r.closeProbability && r.closeProbability !== "Low" && (
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 20,
                            background: hexA(CLOSE_PROB_COLOR[r.closeProbability], 0.15),
                            color: CLOSE_PROB_COLOR[r.closeProbability] }}>{r.closeProbability}</span>
                        )}
                        {r.revenuePotential > 0 && (
                          <span style={{ fontSize: 10.5, color: C.ink3 }}>{money(r.revenuePotential)}</span>
                        )}
                        {r.nextAction && (
                          <span style={{ fontSize: 10.5, color: r.nextAction <= new Date().toISOString().slice(0,10) ? "#C0573F" : C.ink3 }}>
                            → {fmtDate(r.nextAction)}
                          </span>
                        )}
                      </div>
                      {/* Checklist mini progress */}
                      {(() => {
                        const cl = r.checklist || {};
                        const d = Object.values(cl).filter(Boolean).length;
                        const t = PARTNER_CHECKLIST.length;
                        if (d === 0) return null;
                        const pct = Math.round((d / t) * 100);
                        const col = pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold;
                        return (
                          <div style={{ marginTop: 7 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 9.5, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>Launch checklist</span>
                              <span style={{ fontSize: 9.5, color: col, fontWeight: 700 }}>{d}/{t}</span>
                            </div>
                            <div style={{ height: 4, background: C.line, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: pct + "%", background: col, borderRadius: 4 }} />
                            </div>
                          </div>
                        );
                      })()}
                    </button>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   BOARD
   ============================================================ */
function BoardView({ groups, onOpen, cardKeys, ctx, section }) {
  return (
    <div className="sb-board">
      {groups.map((g) => (
        <div key={g.key} className="sb-col">
          <div className="sb-colhead">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              <Dot color={g.color} /> <span style={{ fontWeight: 600, fontSize: 13 }}>{g.label}</span>
            </span>
            <span style={{ color: C.ink3, fontSize: 12 }}>{g.cards.length}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {g.cards.length === 0 && <div className="sb-emptycard">—</div>}
            {g.cards.map((r) => (
              <button key={r.id} className="sb-bcard" onClick={() => onOpen(r)} style={{ borderLeft: `3px solid ${g.color}` }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 5 }}>
                  {section === "offers" || section === "followups" ? clientShort(ctx.derived.clientName[r.clientId] || cleanName(r.name)) : cleanName(r.name)}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {cardKeys.map((k) => cardChip(k, r, ctx)).filter(Boolean)}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
function cardChip(k, r, ctx) {
  if (k === "clientType" && r.clientType) return <MiniChip key={k} color={CLIENT_TYPE_COLOR[r.clientType] || C.ink3}>{r.clientType}</MiniChip>;
  if (k === "tags" && r.tags && r.tags.length) return (
    <div key={k} style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {r.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: hexA(TAG_COLOR[t] || C.ink3, 0.15), color: TAG_COLOR[t] || C.ink3 }}>{t}</span>)}
      {r.tags.length > 2 && <span style={{ fontSize: 10, color: C.ink3 }}>+{r.tags.length - 2}</span>}
    </div>
  );
  if (k === "nextSession" && r.nextSession) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextSession)}</MiniChip>;
  if (k === "nextAction" && r.nextAction) return <MiniChip key={k}><CalendarDays size={11} /> {fmtDate(r.nextAction)}</MiniChip>;
  if (k === "packageType" && r.packageType && r.packageType !== "None") return <MiniChip key={k}>{r.packageType}</MiniChip>;
  if (k === "referral" && r.referral) return <MiniChip key={k} color={REFERRAL_COLOR[r.referral]}>{r.referral} referral</MiniChip>;
  if (k === "location" && r.location) return <MiniChip key={k}>{r.location.split(",")[0]}</MiniChip>;
  if (k === "contact" && r.contact) return <MiniChip key={k}>{r.contact}</MiniChip>;
  if (k === "studioType" && r.studioType) return <MiniChip key={k}>{fmtStudioType(r.studioType)}</MiniChip>;
  if (k === "closeProbability" && r.closeProbability) return <MiniChip key={k} color={CLOSE_PROB_COLOR[r.closeProbability]}>{r.closeProbability}</MiniChip>;
  if (k === "stage") return null;
  if (k === "clientId") { const n = ctx.derived.clientName[r.clientId]; return n ? <MiniChip key={k}>{clientShort(n)}</MiniChip> : null; }
  if (k === "outcome") return r.outcome ? <MiniChip key={k} color={C.brand}>done</MiniChip> : <MiniChip key={k} color={C.gold}>pending</MiniChip>;
  return null;
}

/* ============================================================
   CALENDAR (month)
   ============================================================ */
function CalendarView({ rows, today, derived, data, onOpen }) {
  const [cursor, setCursor] = useState(today.slice(0, 7));
  const [calSearch, setCalSearch] = useState("");
  const [y, m] = cursor.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startDow = first.getDay();
  const daysIn = new Date(y, m, 0).getDate();

  // Build client name map before filtering
  const sessionClientNames = {};
  (data?.registrations || []).forEach(reg => {
    if (reg.sessionId) {
      const client = (data?.clients || []).find(c => c.id === reg.clientId);
      if (client) (sessionClientNames[reg.sessionId] ||= []).push(cleanName(client.name));
    }
  });

  // Filter rows by calendar search (name, studio, journey, client)
  const filteredRows = calSearch.trim()
    ? rows.filter(s => {
        const q = norm(calSearch);
        const studioName = derived.partnerName[s.studioId] ? norm(cleanName(derived.partnerName[s.studioId])) : "";
        const journey    = norm(s.journey || s.name || "");
        const sesName    = norm(s.name || "");
        const clients    = (sessionClientNames[s.id] || []).map(n => norm(n)).join(" ");
        return studioName.includes(q) || journey.includes(q) || sesName.includes(q) || clients.includes(q);
      })
    : rows;

  const byDay = {};
  filteredRows.forEach((s) => { if (s.date && s.date.slice(0, 7) === cursor) (byDay[Number(s.date.slice(8, 10))] ||= []).push(s); });
  const shift = (n) => { let mm = m + n, yy = y; if (mm < 1) { mm = 12; yy--; } if (mm > 12) { mm = 1; yy++; } setCursor(`${yy}-${String(mm).padStart(2, "0")}`); };
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysIn; d++) cells.push(d);

  // sessionClientName: first client name per session (for pill labels)
  const sessionClientName = {};
  Object.entries(sessionClientNames).forEach(([sid, names]) => { sessionClientName[sid] = names[0]; });

  const isStudio = (s) => !!(s.studioId && derived.partnerName[s.studioId]);

  const spotsLeft = (s) => {
    const cap = Number(s.capacity) || 0;
    const reg = Number(s.registered) || 0;
    if (!cap) return null;
    return Math.max(0, cap - reg);
  };

  const pillLabel = (s) => {
    const partner = derived.partnerName[s.studioId] ? cleanName(derived.partnerName[s.studioId]) : "";
    const clientName = sessionClientName[s.id] || "";
    const rawName = cleanName(s.name);
    const journeyLabel = partner
      ? (s.journey || rawName)
      : (rawName.includes(" - ") ? rawName.slice(rawName.indexOf(" - ") + 3) : rawName);
    const spots = spotsLeft(s);
    const spotsTag = spots != null ? `${spots} spot${spots !== 1 ? "s" : ""} left` : "";
    // Studio: Studio · Journey · spots left  |  Virtual: Client · Journey
    const parts = partner
      ? [partner, journeyLabel, spotsTag]
      : [clientName, journeyLabel];
    return parts.filter(Boolean).join(" · ");
  };

  const pillTitle = (s) => {
    const partner = derived.partnerName[s.studioId] ? `@ ${cleanName(derived.partnerName[s.studioId])}` : "";
    const clientName = sessionClientName[s.id] || "";
    const spots = spotsLeft(s);
    const spotsInfo = spots != null ? `${spots} of ${s.capacity} spots remaining` : "";
    return [cleanName(s.name), partner, clientName, spotsInfo].filter(Boolean).join(" · ");
  };

  return (
    <div className="sb-card" style={{ padding: 16, display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: 480 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0, gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 600 }}>{MONTHS[m - 1]} {y}</div>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 180px", maxWidth: 280 }}>
          <Search size={13} color={C.ink3} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            value={calSearch}
            onChange={e => setCalSearch(e.target.value)}
            placeholder="Search client, studio, journey…"
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 28, paddingRight: calSearch ? 26 : 10, paddingTop: 6, paddingBottom: 6, borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: C.surface, outline: "none" }}
          />
          {calSearch && (
            <button onClick={() => setCalSearch("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, lineHeight: 1 }}>✕</button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 10.5, color: C.ink3, display: "flex", alignItems: "center", gap: 10, marginRight: 6 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: LANE.b2b.color, display: "inline-block" }} />Studio
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: C.brand, display: "inline-block" }} />Virtual / Private
            </span>
          </span>
          <button className="sb-iconbtn" onClick={() => shift(-1)}><ChevronLeft size={16} /></button>
          <button className="sb-iconbtn" onClick={() => setCursor(today.slice(0, 7))} style={{ width: "auto", padding: "0 12px", fontSize: 13 }}>Today</button>
          <button className="sb-iconbtn" onClick={() => shift(1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Day-of-week labels — fixed row, not part of the stretching grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, flexShrink: 0, marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="sb-caldow">{d}</div>
        ))}
      </div>

      {/* Date cells — flex:1 so rows fill remaining height */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gridAutoRows: "1fr", gap: 6, overflow: "hidden" }}>
        {cells.map((d, i) => {
          const iso = d ? `${cursor}-${String(d).padStart(2, "0")}` : null;
          const isToday = iso === today;
          return (
            <div key={i} className="sb-calcell" style={{
              background: d ? (isToday ? C.brandMist : C.surface) : "transparent",
              border: d ? `1px solid ${isToday ? C.brand : C.line}` : "none",
              minHeight: 0,
            }}>
              {d && <div style={{ fontSize: 11, color: isToday ? C.brand : C.ink3, fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>{d}</div>}
              {(byDay[d] || []).map((s) => {
                const studio = isStudio(s);
                const spots = spotsLeft(s);
                const almostFull = spots != null && spots <= 3;
                return (
                  <button key={s.id}
                    onClick={() => onOpen(s)}
                    title={pillTitle(s)}
                    style={{
                      fontSize: 10.5, fontWeight: 600, border: "none", borderRadius: 5,
                      padding: "3px 5px", cursor: "pointer", textAlign: "left",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      width: "100%", display: "block",
                      background: studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft,
                      color: studio ? LANE.b2b.text : C.brandDeep,
                      borderLeft: studio ? `3px solid ${almostFull ? "#C0573F" : LANE.b2b.color}` : `3px solid ${C.brand}`,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = studio ? LANE.b2b.color : C.brand; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = studio ? hexA(LANE.b2b.color, 0.15) : C.brandSoft; e.currentTarget.style.color = studio ? LANE.b2b.text : C.brandDeep; }}>
                    {pillLabel(s)}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   RECORD DRAWER (view / edit / create)
   ============================================================ */
const FIELDS = {
  clients: [
    f("name", "Name", "text", { title: true }),
    f("phone", "Phone", "phone"), f("email", "Email", "email"),
    f("sessionsAttended", "Sessions attended", "number"),
    f("firstSession", "First session", "date"), f("lastSession", "Last session", "date"),
    f("nextSession", "Next session", "date"),
    f("notes", "Emotional notes", "textarea"),
    f("status", "Status", "select", { options: () => getS().clientStatuses }),
    f("clientType", "Client type", "select", { options: () => getS().clientTypes }),
    f("source", "Source", "select", { options: () => getS().sources }),
    f("referral", "Referral potential", "select", { options: () => getS().referralLevels }),
    f("packageType", "Package type", "select", { options: () => getS().packageTypes }),
    f("tags", "Intent tags", "multiselect", { options: INTENT_TAGS, colorMap: TAG_COLOR }),
    f("lifetimeValue", "Lifetime value", "currency"),
  ],
  partners: [
    f("name", "Studio name", "text", { title: true }),
    f("location", "Location", "text", { wide: true }),
    f("contact", "Contact name", "text"),
    f("role", "Role", "dropdown", { options: ["Owner", "Manager", "Director", "GM", "Instructor"] }),
    f("email", "Email", "email"), f("phone", "Phone", "phone"),
    f("estimatedCommunitySize", "Est. community size", "number"),
    f("bestFitJourney", "Best-fit journey", "text"),
    f("revenuePotential", "Revenue potential", "currency"),
    f("studioType", "Studio type", "tagselector", { options: STUDIO_TYPE }),
    f("closeProbability", "Close probability", "select", { options: CLOSE_PROB }),
    f("stage", "Pipeline stage", "select", { options: STAGE }),
    f("revShare", "Revenue share model", "text"),
    f("contractStatus", "Contract status", "select", { options: CONTRACT_STATUS }),
    f("outreachDate", "First outreach date", "date"),
    f("lastTouch", "Last touch date", "date"),
    f("nextAction", "Next action date", "date"),
    f("avgAttendance", "Avg attendance", "number"),
    f("sessionsPerMonth", "Sessions per month", "number"),
    f("insuranceReqs", "Insurance requirements", "textarea"),
    f("promotionCommitments", "Promotion commitments", "textarea"),
    f("notes", "Conversation notes", "textarea"),
  ],
  sessions: [
    f("name", "Session name", "text", { title: true }), f("studioId", "Studio", "relation", { target: "partners" }),
    f("status", "Status", "select", { options: SESSION_STATUS }),
    f("journey", "Journey used", "select", { options: () => (getS().journeyDescriptions || []).map(j => j.name).filter(Boolean) }),
    f("date", "Date", "date"), f("time", "Time", "text"), f("durationMins", "Duration (mins)", "number"),
    f("capacity", "Room capacity", "number"), f("registered", "Registered attendees", "number"),
    f("attendance", "Actual attendance", "number"), f("paidAttendees", "Paid attendees", "number"),
    f("waivers", "Waivers completed", "number"), f("noShows", "No-shows", "number"),
    f("revenue", "Gross revenue", "currency"), f("studioSplit", "Studio split (paid out)", "currency"),
    f("netRevenue", "Your net revenue", "currency"),
    f("conversion", "Package conversion rate", "percent"), f("packagesSold", "Packages sold", "number"),
    f("referralsGenerated", "Referrals generated", "number"),
    f("testimonialsCapt", "Testimonials captured", "number"),
    f("roomSetupStatus", "Room setup status", "select", { options: SETUP_STATUS }),
    f("musicSetupStatus", "Music/headset status", "select", { options: SETUP_STATUS }),
    f("equipmentNeeded", "Equipment needed", "textarea"),
    f("breakthroughNoted", "Breakthrough noted?", "checkbox"),
    f("notes", "Session notes", "textarea"),
    f("locationAddress", "Studio Address", "text"),
    f("locationType",   "Location Type", "select", { options: ["zoom", "physical", "custom", "phone", "other"] }),
    f("locationJoinUrl","Zoom / Join URL", "text"),
    f("calendlyEventUri", "Calendly Event URI", "text"),
  ],
  offers: [
    f("name", "Offer", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("offerType", "Offer type", "select", { options: () => getS().offerTypes }), f("price", "Amount", "currency"),
    f("status", "Status", "select", { options: OFFER_STATUS }),
    f("probability", "Close probability", "select", { options: OFFER_PROB }),
    f("source", "Source", "select", { options: () => getS().sources }),
    f("dateOffered", "Date offered", "date"), f("expireDate", "Expiration date", "date"), f("followUpDate", "Follow-up date", "date"),
    f("notes", "Notes", "textarea"), f("reasonLost", "Reason lost", "text"),
  ],
  revenue: [
    f("name", "Description", "text", { title: true }), f("date", "Date", "date"),
    f("channel", "Channel", "select", { options: REV_CHANNEL }),
    f("gross", "Gross revenue", "currency"), f("stripeFee", "Processing fee (Stripe)", "currency"),
    f("studioSplit", "Studio split", "currency"), f("facilitatorCost", "Facilitator cost", "currency"), f("refunds", "Refunds", "currency"),
    f("source", "Source", "select", { options: SOURCE }), f("campaign", "Campaign", "text"),
    f("sessionId", "Session", "relation", { target: "sessions" }), f("clientId", "Client", "relation", { target: "clients" }),
    f("costCenter", "Cost center", "select", { options: COST_CENTER }), f("notes", "Notes", "textarea"),
  ],
  content: [
    f("name",          "Post title / idea",       "text",     { title: true }),
    f("category",      "Content category",        "select",   { options: CONTENT_CATEGORY }),
    f("status",        "Status",                  "select",   { options: CONTENT_STATUS }),
    f("platform",      "Platform",                "select",   { options: PLATFORM }),
    f("body",          "Draft / caption",         "textarea"),
    f("cta",           "Call to action",          "select",   { options: CONTENT_CTA }),
    f("scheduledDate", "Scheduled date",          "date"),
    f("datePosted",    "Published date",          "date"),
    f("sessionId",     "Session promoted",        "relation", { target: "sessions" }),
    f("partnerId",     "Studio partner tagged",   "relation", { target: "partners" }),
    f("reused",        "Repurposed content?",     "checkbox"),
    f("reach",         "Reach",                   "number"),
    f("likes",         "Likes",                   "number"),
    f("comments",      "Comments",                "number"),
    f("shares",        "Shares",                  "number"),
    f("saves",         "Saves",                   "number"),
    f("leads",         "Leads generated",         "number"),
    f("booked",        "Sessions booked",         "number"),
    f("revenue",       "Revenue attributed ($)",  "currency"),
    f("notes",         "Notes",                   "textarea"),
  ],
  followups: [
    f("name", "Follow-up", "text", { title: true }), f("clientId", "Client", "relation", { target: "clients" }),
    f("stage", "Stage", "select", { options: STATUS }), f("futype", "Follow-up type", "select", { options: FUTYPE }),
    f("lastContact", "Last contact", "date"), f("nextAction", "Next action", "date"), f("outcome", "Outcome", "textarea"),
  ],
  referrals: [
    f("referrerId", "Referred by (client)", "relation", { target: "clients" }),
    f("referredName", "Referred person", "text", { title: true }),
    f("referredId", "Referred client (if joined)", "relation", { target: "clients" }),
    f("date", "Referral date", "date"),
    f("status", "Status", "select", { options: REF_STATUS }),
    f("revenue", "Revenue from referral", "currency"),
    f("thankYouSent", "Thank-you sent?", "checkbox"),
    f("rewardGiven", "Reward given?", "checkbox"),
    f("notes", "Notes", "textarea"),
  ],
  outreach: [
    f("name",             "Target / org name",    "text",     { title: true }),
    f("targetType",       "Target type",          "select",   { options: OUTREACH_TARGET_TYPE }),
    f("contactName",      "Contact person",       "text"),
    f("email",            "Email",                "email"),
    f("phone",            "Phone",                "text"),
    f("location",         "Location",             "text"),
    f("source",           "How found",            "select",   { options: OUTREACH_SOURCE }),
    f("warmth",           "Relationship warmth",  "select",   { options: OUTREACH_WARMTH }),
    f("priority",         "Priority",             "select",   { options: OUTREACH_PRIORITY }),
    f("status",           "Contact status",       "select",   { options: OUTREACH_STATUS }),
    f("responseStatus",   "Response status",      "select",   { options: OUTREACH_RESPONSE }),
    f("outreachMessage",  "Message / script used","textarea"),
    f("lastContact",      "Last contact date",    "date"),
    f("nextFollowUp",     "Next follow-up date",  "date"),
    f("revenuePotential", "Revenue potential",    "currency"),
    f("partnerId",        "Linked studio partner","relation",  { target: "partners" }),
    f("notes",            "Notes",                "textarea"),
  ],
  testimonials: [
    f("name",            "Testimonial title",      "text",       { title: true }),
    f("clientId",        "Client",                 "relation",   { target: "clients" }),
    f("sessionId",       "Session attended",       "relation",   { target: "sessions" }),
    f("status",          "Status",                 "select",     { options: TESTIMONIAL_STATUS }),
    f("type",            "Type",                   "select",     { options: TESTIMONIAL_TYPE }),
    f("content",         "Full testimonial",       "textarea"),
    f("bestQuote",       "Best quote",             "textarea"),
    f("beforeSummary",   "Before (client state)",  "textarea"),
    f("afterSummary",    "After (what shifted)",   "textarea"),
    f("themes",          "Themes",                 "multiselect",{ options: TESTIMONIAL_THEMES }),
    f("permissionReceived","Permission received?", "checkbox"),
    f("useOnWebsite",    "Use on website?",        "checkbox"),
    f("useOnSocial",     "Use on social?",         "checkbox"),
    f("firstNameOnly",   "First name only?",       "checkbox"),
    f("videoUrl",        "Video URL",              "text"),
    f("dateReceived",    "Date received",          "date"),
    f("datePublished",   "Date published",         "date"),
    f("notes",           "Notes",                  "textarea"),
  ],
  templates: [
    f("name",      "Template name",      "text",     { title: true }),
    f("subject",   "Email subject line", "text"),
    f("body",      "Message body",       "textarea", { rows: 9 }),
    f("notes",     "Notes / usage tips", "textarea"),
    f("variables", "Variables (e.g. {{clientName}})", "text"),
    f("category",  "Category",           "select",   { options: TMPL_CATEGORY }),
    f("channel",   "Channel",            "select",   { options: TMPL_CHANNEL }),
    f("linkedTo",  "Linked to",          "select",   { options: TMPL_LINKED_TO }),
  ],
  expenses: [
    f("date",          "Date",             "date",     { title: true }),
    f("vendor",        "Vendor / Payee",   "text"),
    f("description",   "Description",      "text"),
    f("amount",        "Amount ($)",       "number"),
    f("category",      "Category",         "select",   { options: EXPENSE_CATEGORY }),
    f("paymentMethod", "Payment Method",   "select",   { options: EXPENSE_PAYMENT_METHOD }),
    f("taxDeductible", "Tax Deductible?",  "checkbox"),
    f("recurring",     "Recurring?",       "checkbox"),
    f("recurringFreq", "Frequency",        "select",   { options: EXPENSE_RECUR_FREQ }),
    f("linkedSession", "Linked Session",   "text"),
    f("linkedPartner", "Linked Studio",    "text"),
    f("receiptUrl",    "Receipt URL",      "text"),
    f("notes",         "Notes",            "textarea"),
  ],
  registrations: [
    f("eventName",      "Event / Session Name",        "text",     { title: true }),
    f("clientId",       "Client",                      "relation", { target: "clients" }),
    f("status",         "Booking Status",              "select",   { options: ["booked", "attended", "canceled", "rescheduled", "no_show"] }),
    f("paymentStatus",  "Payment Status",              "select",   { options: ["paid", "unpaid", "unknown"] }),
    f("waiverStatus",   "Waiver Status",               "select",   { options: ["pending", "signed"] }),
    f("scheduledAt",    "Session Date/Time",           "text"),
    f("timezone",       "Timezone",                    "text"),
    f("locationType",   "Location Type",               "select",   { options: ["zoom", "physical", "custom", "phone", "other"] }),
    f("locationJoinUrl","Zoom / Join URL",             "text"),
    f("locationAddress","In-Person Address",           "text"),
    f("attendanceType", "Attending Virtually or In Person", "text"),
    f("checkedIn",      "Checked In?",                 "checkbox"),
    f("attended",       "Attended?",                   "checkbox"),
    f("noShow",         "No Show?",                    "checkbox"),
    f("doneBreathworkBefore", "Done Breathwork Before?", "text"),
    f("howHeard",       "How Did They Hear About Us?", "text"),
    f("referredBy",     "Referred By",                 "text"),
    f("concerns",       "Physical / Emotional Concerns", "textarea"),
    f("reviewedContraindications", "Reviewed Contraindications?", "text"),
    f("calendlyInviteeUri", "Calendly Invitee URI",    "text"),
    f("calendlyEventUri",   "Calendly Event URI",      "text"),
    f("notes",          "Notes",                       "textarea"),
  ],
};
function f(key, label, type, opts = {}) { return { key, label, type, ...opts }; }

function RecordDrawer({ db, record, data, derived, today, crmSettings, onClose, onSave, onDelete, onOpenRelated, sequences, onStartSequence }) {
  const [draft, setDraft] = useState(record);
  const [tab, setTab] = useState("details");
  const [showJourneyDesc, setShowJourneyDesc] = useState(false);
  useEffect(() => { setDraft(record); setTab("details"); setShowJourneyDesc(false); }, [record]);
  const isVirtualDrawer = db === "sessions" && !record.studioId && (record.locationType === "zoom" || record.locationType === "custom" || !record.locationType);

  // For studio sessions keep "Registered Attendees" in sync with the actual
  // registration records — this is the authoritative count, not the Calendly field.
  const isStudioSession = db === "sessions" && !!record.studioId;
  const actualRegistered = isStudioSession
    ? (data.registrations || []).filter(r => r.sessionId === record.id && r.status !== "canceled").length
    : null;
  useEffect(() => {
    if (isStudioSession) setDraft(d => ({ ...d, registered: actualRegistered }));
  }, [actualRegistered, isStudioSession]);

  // For clients keep "Sessions Attended" in sync with actual registration records
  const actualSessionsAttended = db === "clients"
    ? (data.registrations || []).filter(r => r.clientId === record.id && r.status !== "canceled").length
    : null;
  useEffect(() => {
    if (db === "clients") setDraft(d => ({ ...d, sessionsAttended: actualSessionsAttended }));
  }, [actualSessionsAttended, db]);
  const fields = FIELDS[db];
  const titleField = fields.find((x) => x.title);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const isNew = !(data[db] || []).some((r) => r.id === record.id);
  const hasTimeline = (db === "clients" || db === "partners") && !isNew;
  const hasChecklist = db === "partners" && !isNew;
  const hasSessionTabs = db === "sessions" && !isNew;
  const isVirtualSession = hasSessionTabs && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);

  // related records (used in details tab)
  const related = [];
  if (db === "clients") {
    related.push({ label: "Offers", items: data.offers.filter((o) => o.clientId === draft.id), dbk: "offers", render: (o) => `${o.offerType} · ${money(o.price)} · ${o.status}` });
    related.push({ label: "Follow-ups", items: data.followups.filter((x) => x.clientId === draft.id), dbk: "followups", render: (x) => `${x.futype} · ${fmtDate(x.nextAction)}${x.outcome ? " · done" : ""}` });
    const acc = derived.acceptedByClient[draft.id] || 0;
    related.unshift({ label: "Accepted offers total", note: money(acc) });
  }
  if (db === "partners") {
    const ses = derived.sessionsByStudio[draft.id] || [];
    related.push({ label: "Sessions", items: ses, dbk: "sessions", render: (s) => `${fmtDate(s.date)} · ${s.attendance} in room · ${money(s.netRevenue)} net` });
    if (ses.length) related.unshift({ label: "Logged", note: `${ses.length} sessions · avg ${Math.round(sum(ses, "attendance") / ses.length)} attending` });
  }

  return (
    <div className="sb-drawerwrap" onMouseDown={onClose}>
      <div className={"sb-drawer" + (hasTimeline && tab === "timeline" ? " sb-drawer-wide" : "")}
        onMouseDown={(e) => e.stopPropagation()}>

        {/* Accent stripe */}
        <div style={{ height: 4, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDeep})`, flexShrink: 0 }} />

        <div className="sb-drawerhead">
          <span className="sb-eyebrow">{isNew ? "New" : "Edit"} · {sectionLabel(db)}</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Title + tab switcher */}
        <div style={{ padding: "14px 22px 0", borderBottom: `1px solid ${C.line}` }}>
          {/* Session: show studio + cleaned session name as formatted header */}
          {hasSessionTabs && derived.partnerName[draft.studioId] && (() => {
            const studioName = cleanName(derived.partnerName[draft.studioId]);
            const rawName = cleanName(draft.name || "");
            // Strip known prefixes ("") and date suffixes (" 6/9", " 6/11" etc.)
            const stripped = rawName
              .replace(/^sample\s*[-–]\s*/i, "")
              .replace(/\s+\d{1,2}\/\d{1,2}(\/\d{2,4})?$/i, "")
              .replace(new RegExp(`^${studioName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[-–]\\s*`, "i"), "")
              .trim();
            return (
              <div style={{ fontSize: 13, color: C.ink2, fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.brand }}>{studioName}</span>
                <span style={{ color: C.ink3 }}>—</span>
                <span>{stripped}</span>
              </div>
            );
          })()}
          <div style={{ marginBottom: 10 }}>
            <div style={{ position: "relative" }}>
              <input className="sb-titleinput" style={{ width: "100%", paddingRight: isVirtualDrawer ? 32 : undefined }}
                value={draft[titleField.key] || ""} placeholder="Untitled"
                onChange={(e) => set(titleField.key, e.target.value)} />
              {isVirtualDrawer && (
                <button
                  onClick={() => setShowJourneyDesc(d => !d)}
                  title={draft.journey ? `View description for: ${draft.journey}` : "No journey selected"}
                  style={{
                    position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                    background: showJourneyDesc ? C.brand : "transparent",
                    border: `1.5px solid ${showJourneyDesc ? C.brand : C.line}`,
                    borderRadius: 6, cursor: "pointer", padding: "2px 6px",
                    color: showJourneyDesc ? "#fff" : C.ink3,
                    fontSize: 12, fontWeight: 700, lineHeight: 1.4, transition: "all 0.15s",
                  }}>
                  {"\u24D8"}
                </button>
              )}
            </div>
            {isVirtualDrawer && showJourneyDesc && (() => {
              const journeyDescs = (crmSettings?.journeyDescriptions || []);
              // Match by exact name first, then by partial containment to handle
              // Calendly event names like "9D Breathwork Virtual - The Architect Journey"
              // where the journey description is just "The Architect Journey".
              const sessionJourney = (draft.journey || "").toLowerCase();
              const match = journeyDescs.find(j => j.name && j.name.toLowerCase() === sessionJourney)
                || journeyDescs
                    .filter(j => j.name && sessionJourney.includes(j.name.toLowerCase()))
                    .sort((a, b) => b.name.length - a.name.length)[0]; // prefer longest/most-specific match
              return (
                <div style={{
                  marginTop: 8, borderRadius: 12,
                  border: `1px solid ${C.line}`,
                  background: C.surface,
                  overflow: "hidden",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "10px 14px", borderBottom: `1px solid ${C.line}`,
                    background: hexA(C.brand, 0.06),
                  }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.6 }}>Journey Description</div>
                      {match?.name && <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginTop: 2 }}>{match.name}</div>}
                    </div>
                    <button onClick={() => setShowJourneyDesc(false)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, fontSize: 18, lineHeight: 1, padding: "2px 4px" }}>
                      &times;
                    </button>
                  </div>
                  <div style={{ padding: "12px 14px", fontSize: 13, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto" }}>
                    {match?.description
                      ? match.description
                      : <span style={{ color: C.ink3, fontStyle: "italic" }}>
                          {draft.journey
                            ? `No description has been added for "${match?.name || draft.journey}" yet. Go to Admin \u2192 Journey Descriptions to add one.`
                            : "No journey selected for this session."}
                        </span>
                    }
                  </div>
                </div>
              );
            })()}
          </div>
          {(hasTimeline || hasSessionTabs) && (
            <div style={{ display: "flex", gap: 2 }}>
              {(hasSessionTabs ? [
                ["details", "Session Details"],
                ["bookings", "Bookings"],
                ["session-checklist", "Session Checklist"],
                ["performance", "Performance"],
              ] : [
                ["details", "Details"],
                ...(db === "clients" && !isNew ? [["sessions-attended", "Sessions Attended"]] : []),
                ...(db === "partners" && !isNew ? [["partner-sessions", "Sessions"]] : []),
                ...(db === "partners" && !isNew ? [["agreements", "Agreements"]] : []),
                ...(hasChecklist ? [["checklist", "Launch Checklist"]] : []),
                ["timeline", "Contact Timeline"],
              ]).map(([t, label]) => {
                const sessionBookings = t === "bookings" ? (data.registrations || []).filter(r => r.sessionId === draft.id && r.status !== "canceled") : null;
                const clientSessionCount = t === "sessions-attended" ? (data.registrations || []).filter(r => r.clientId === draft.id && r.status !== "canceled").length : null;
                const partnerSessionCount = t === "partner-sessions" ? (data.sessions || []).filter(s => s.studioId === draft.id).length : null;
                const isVirtualSession = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                const activeSessionChecklist = SESSION_CHECKLIST.filter(i => isVirtualSession ? i.virtual : !i.virtual);
                const activeEquipPhases = EQUIP_CHECKLIST_PHASES.map(p => ({ ...p, items: p.items.filter(i => isVirtualSession ? i.virtual : !i.virtual) })).filter(p => p.items.length);
                const activeEquipItems = activeEquipPhases.flatMap(p => p.items);
                const isStudioBookings = t === "bookings" && db === "sessions" && !!draft.studioId;
                const done = (t === "agreements") ? (draft.agreements || []).length
                           : (t === "partner-sessions") ? partnerSessionCount
                           : (t === "sessions-attended") ? clientSessionCount
                           : (t === "checklist" && db === "partners") ? Object.values(draft.checklist || {}).filter(Boolean).length
                           : (t === "session-checklist") ? activeEquipItems.filter(i => draft.equipChecklist?.[i.id]).length + activeSessionChecklist.filter(i => draft.checklist?.[i.id]).length
                           : (t === "bookings") ? sessionBookings.length : null;
                const total = (t === "checklist" && db === "partners") ? PARTNER_CHECKLIST.length
                            : (t === "session-checklist") ? activeEquipItems.length + activeSessionChecklist.length
                            : isStudioBookings ? (Number(draft.capacity) || null)
                            : (t === "bookings") ? (data.registrations || []).filter(r => r.sessionId === draft.id).length : null;
                return (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding: "7px 14px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
                    cursor: "pointer", background: tab === t ? C.brand : "transparent",
                    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
                  }}>
                    {label}
                    {done != null && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 20,
                        background: done === total ? "#4A8C6F" : tab === t ? "rgba(255,255,255,0.25)" : C.brandSoft,
                        color: done === total ? "#fff" : tab === t ? "#fff" : C.brandDeep,
                      }}>{done}{total != null ? `/${total}` : ""}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sb-drawerbody" style={{ paddingTop: 16 }}>
          {db === "clients" && tab === "sessions-attended"
            ? <ClientSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : db === "partners" && tab === "agreements"
            ? <PartnerAgreementsTab agreements={draft.agreements || []} onChange={(a) => set("agreements", a)} partnerName={cleanName(draft.name)} />
            : db === "partners" && tab === "partner-sessions"
            ? <PartnerSessionsTab record={draft} data={data} onOpenRelated={onOpenRelated} today={today} />
            : hasTimeline && tab === "timeline"
            ? <ContactTimeline db={db} record={draft} data={data} derived={derived} today={today} onOpenRelated={onOpenRelated} />
            : (hasChecklist || hasSessionTabs) && tab === "checklist"
            ? <PartnerLaunchChecklist checklist={draft.checklist || emptyChecklist()} onChange={(cl) => set("checklist", cl)} partnerName={cleanName(draft.name)} />
            : hasSessionTabs && tab === "bookings"
            ? <SessionBookingsTab record={draft} data={data} onOpenRelated={onOpenRelated} />
            : hasSessionTabs && tab === "session-checklist"
            ? isVirtualSession
              ? <VirtualSessionChecklist
                  equipChecklist={draft.equipChecklist || emptyEquipChecklist()}
                  onEquipChange={(cl) => set("equipChecklist", cl)}
                  checklist={draft.checklist || emptySessionChecklist()}
                  onChecklistChange={(cl) => set("checklist", cl)}
                  sessionName={cleanName(draft.name)}
                  sessionDate={draft.date}
                  status={draft.status}
                />
              : <StudioSessionChecklist
                  equipChecklist={draft.equipChecklist || emptyEquipChecklist()}
                  onEquipChange={(cl) => set("equipChecklist", cl)}
                  checklist={draft.checklist || emptySessionChecklist()}
                  onChecklistChange={(cl) => set("checklist", cl)}
                  sessionName={cleanName(draft.name)}
                  sessionDate={draft.date}
                  status={draft.status}
                />
            : hasSessionTabs && tab === "performance"
            ? <SessionPerformance record={draft} derived={derived} data={data} />
            : (
              <>
                {(() => {
                  const isVirtual = db === "sessions" && !draft.studioId && (draft.locationType === "zoom" || draft.locationType === "custom" || !draft.locationType);
                  const isStudioSession = db === "sessions" && !!draft.studioId;
                  const zoomUrl = draft.locationJoinUrl;
                  const virtualHidden = new Set(["studioId", "locationAddress", "equipmentNeeded", "locationType", "locationJoinUrl", "calendlyEventUri", "roomSetupStatus", "musicSetupStatus"]);
                  const studioHidden  = new Set(["studioId", "equipmentNeeded", "capacity", "registered", "notes", "breakthroughNoted", "roomSetupStatus", "musicSetupStatus", "locationJoinUrl", "calendlyEventUri"]);
                  const baseFields = fields.filter((x) => !x.title
                    && !(isVirtual     && virtualHidden.has(x.key))
                    && !(isStudioSession && studioHidden.has(x.key)));
                  const topKeys = isStudioSession
                    ? ["date", "time", "durationMins", "locationAddress"]
                    : ["date", "time", "durationMins"];
                  const virtualOrderFirst = ["date", "time", "durationMins", "notes", "breakthroughNoted", "journey", "status"];
                  const virtualPinned = ["notes", "breakthroughNoted", "journey", "status"];
                  const visibleFields = (isVirtual || isStudioSession)
                    ? [
                        ...baseFields.filter(x => topKeys.includes(x.key)),
                        ...(isVirtual
                          ? [
                              ...baseFields.filter(x => virtualPinned.includes(x.key)).sort((a,b) => virtualOrderFirst.indexOf(a.key) - virtualOrderFirst.indexOf(b.key)),
                              ...baseFields.filter(x => !topKeys.includes(x.key) && !virtualPinned.includes(x.key)),
                            ]
                          : baseFields.filter(x => !topKeys.includes(x.key))
                        ),
                      ]
                    : baseFields;
                  const sessionClient = isVirtual
                    ? (() => {
                        const reg = (data.registrations || []).find(r => r.sessionId === draft.id && r.status !== "canceled");
                        return reg ? (data.clients || []).find(c => c.id === reg.clientId) : null;
                      })()
                    : null;
                  const studioColor = LANE.b2b.color;
                  return (
                    <div className="sb-fields">
                      {/* Virtual: show client card */}
                      {isVirtual && sessionClient && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ width: 34, height: 34, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                            {sessionClient.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{cleanName(sessionClient.name)}</div>
                            {sessionClient.email && <div style={{ fontSize: 12, color: C.ink3 }}>{sessionClient.email}</div>}
                          </div>
                        </div>
                      )}
                      {/* Studio: Date + Time + Duration on one line */}
                      {isStudioSession && (
                        <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
                          {["date","time","durationMins"].map(k => {
                            const fld = fields.find(x => x.key === k);
                            if (!fld) return null;
                            return (
                              <div key={k} style={{ flex: k === "date" ? 2 : 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 }}>{fld.label}</div>
                                <input
                                  type={k === "date" ? "date" : "text"}
                                  value={draft[k] || ""}
                                  onChange={e => set(k, k === "durationMins" ? Number(e.target.value) : e.target.value)}
                                  style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, background: C.surface, color: C.ink, outline: "none" }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {visibleFields.map((fld) => {
                        if (isStudioSession && (fld.key === "date" || fld.key === "time" || fld.key === "durationMins")) return null;
                        return (
                        <>
                          <FieldInput key={fld.key} fld={fld} value={draft[fld.key]} onChange={(v) => set(fld.key, v)} data={data} />
                          {isStudioSession && fld.key === "locationAddress" && (() => {
                            const partner = (data.partners || []).find(p => p.id === draft.studioId);
                            const contactCard = partner && (partner.contact || partner.email || partner.phone) ? (
                              <div key="studio-contact" style={{ gridColumn: "1 / -1", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Studio Contact</div>
                                {partner.contact && <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{partner.contact}{partner.role ? <span style={{ fontWeight: 400, color: C.ink3 }}> · {partner.role}</span> : ""}</div>}
                                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 2 }}>
                                  {partner.email && <a href={`mailto:${partner.email}`} style={{ fontSize: 12, color: C.brand }}>{partner.email}</a>}
                                  {partner.phone && <span style={{ fontSize: 12, color: C.ink3 }}>{partner.phone}</span>}
                                </div>
                              </div>
                            ) : null;
                            const capacityFld        = fields.find(x => x.key === "capacity");
                            const registeredFld      = fields.find(x => x.key === "registered");
                            const notesFld           = fields.find(x => x.key === "notes");
                            const breakthroughFld    = fields.find(x => x.key === "breakthroughNoted");
                            const roomSetupFld       = fields.find(x => x.key === "roomSetupStatus");
                            const musicSetupFld      = fields.find(x => x.key === "musicSetupStatus");
                            return (
                              <>
                                {contactCard}
                                {registeredFld    && <FieldInput key="reg"   fld={registeredFld}    value={draft.registered}        onChange={v => set("registered", v)}        data={data} />}
                                {capacityFld      && <FieldInput key="cap"   fld={capacityFld}      value={draft.capacity}          onChange={v => set("capacity", v)}          data={data} />}
                                <div key="setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                  {[
                                    { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                    { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                  ].map(({ label, key, val }) => (
                                    <div key={key} style={{ flex: 1 }}>
                                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                      <div className="sb-chiprow">
                                        {SETUP_STATUS.map(o => (
                                          <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                            style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                            {o}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {notesFld         && <FieldInput key="notes" fld={notesFld}         value={draft.notes}             onChange={v => set("notes", v)}             data={data} />}
                                {breakthroughFld  && <FieldInput key="bk"   fld={breakthroughFld}  value={draft.breakthroughNoted} onChange={v => set("breakthroughNoted", v)} data={data} />}
                              </>
                            );
                          })()}
                          {isVirtual && fld.key === "durationMins" && (
                            <>
                              <div key="zoom-card" style={{ gridColumn: "1 / -1", background: C.brandMist, border: `1px solid ${C.brand}`, borderRadius: 10, padding: "10px 14px" }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Zoom / Join Link</div>
                                {zoomUrl && zoomUrl.startsWith("https://") ? (
                                  <a href={zoomUrl} target="_blank" rel="noreferrer noopener"
                                    style={{ fontSize: 13, color: C.brand, fontWeight: 600, wordBreak: "break-all" }}>{zoomUrl}</a>
                                ) : (
                                  <div style={{ fontSize: 13, color: C.ink3 }}>{zoomUrl || "No Zoom link on file"}</div>
                                )}
                              </div>
                              <div key="virtual-setup-row" style={{ gridColumn: "1 / -1", display: "flex", gap: 24 }}>
                                {[
                                  { label: "Room setup status", key: "roomSetupStatus", val: draft.roomSetupStatus },
                                  { label: "Music/headset status", key: "musicSetupStatus", val: draft.musicSetupStatus },
                                ].map(({ label, key, val }) => (
                                  <div key={key} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>{label}</div>
                                    <div className="sb-chiprow">
                                      {SETUP_STATUS.map(o => (
                                        <button key={o} className="sb-selchip" onClick={() => set(key, o)}
                                          style={{ background: val === o ? C.brand : C.surface, color: val === o ? "#fff" : C.ink2, borderColor: val === o ? C.brand : C.line }}>
                                          {o}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </>
                          )}
                        </>
                        );
                      })}
                    </div>
                  );
                })()}

                {related.length > 0 && (
                  <div style={{ marginTop: 22 }}>
                    {related.map((rel, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div className="sb-rellabel"><Link2 size={13} /> {rel.label}{rel.note ? <span style={{ marginLeft: "auto", color: C.brand, fontWeight: 700 }}>{rel.note}</span> : null}</div>
                        {rel.items && (rel.items.length === 0
                          ? <div style={{ fontSize: 12.5, color: C.ink3, padding: "6px 2px" }}>None yet.</div>
                          : rel.items.map((it) => (
                            <button key={it.id} className="sb-relrow" onClick={() => onOpenRelated({ db: rel.dbk, record: it })}>
                              <span style={{ flex: 1, textAlign: "left" }}>{cleanName(it.name)}</span>
                              <span style={{ color: C.ink2, fontSize: 12 }}>{rel.render(it)}</span>
                              <ArrowUpRight size={13} color={C.ink3} />
                            </button>
                          )))}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          {/* Email history lives in the Contact Timeline tab for both clients and partners */}
        </div>

        <div className="sb-drawerfoot">
          {!isNew && onDelete && <button className="sb-danger" onClick={() => onDelete(draft.id)}><Trash2 size={15} /> Delete</button>}
          {db === "clients" && !isNew && (() => {
            const activeSeq = (sequences || []).find(s => s.clientId === draft.id && s.status === "active");
            const completed  = (sequences || []).some(s => s.clientId === draft.id && s.status === "completed");
            if (activeSeq) return (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.brand, fontWeight: 600 }}>
                <Zap size={13} /> Sequence active · step {activeSeq.steps.filter(s=>s.sent).length}/{activeSeq.steps.length}
              </div>
            );
            return onStartSequence ? (
              <button onClick={() => onStartSequence(draft)} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8,
                background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`,
                color: C.brandDeep, fontWeight: 600, fontSize: 12.5, cursor: "pointer",
              }}>
                <Zap size={13} /> {completed ? "Restart Sequence" : "Start Follow-up Sequence"}
              </button>
            ) : null;
          })()}
          <div style={{ flex: 1 }} />
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          {tab !== "timeline" && onSave && <button className="sb-primary" onClick={() => onSave(draft)}>Save</button>}        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE VIEW (list)
   ============================================================ */
function SessionPerfView({ rows, derived, onOpen }) {
  if (!rows.length) return <Empty pad>No sessions logged yet.</Empty>;

  const allNet = rows.map((r) => Number(r.netRevenue) || 0);
  const avgNet = allNet.reduce((a, b) => a + b, 0) / allNet.length;
  const allConv = rows.filter((r) => r.conversion > 0).map((r) => Number(r.conversion));
  const avgConv = allConv.length ? allConv.reduce((a, b) => a + b, 0) / allConv.length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Benchmark row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 4 }}>
        {[
          { label: "Sessions", val: rows.length },
          { label: "Total net", val: money(allNet.reduce((a, b) => a + b, 0)) },
          { label: "Avg net/session", val: money(Math.round(avgNet)) },
          { label: "Avg conversion", val: pct(avgConv) },
        ].map(({ label, val }) => (
          <div key={label} className="sb-card" style={{ padding: "12px 14px" }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontFamily: FONT.display, fontSize: 22, fontWeight: 600, marginTop: 4 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Per-session cards */}
      {rows.map((r) => {
        const net = Number(r.netRevenue) || 0;
        const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
        const revPerHead = r.attendance ? Math.round(net / r.attendance) : 0;
        const above = net >= avgNet;
        const convColor = r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : r.conversion > 0 ? C.gold : C.ink3;
        const studio = clientShort(derived.partnerName[r.studioId] || "");

        // "Why" analysis
        const insights = [];
        if (r.paidAttendees && r.attendance && r.paidAttendees < r.attendance) insights.push(`${r.attendance - r.paidAttendees} unpaid attendee${r.attendance - r.paidAttendees > 1 ? "s" : ""} — tighten payment flow`);
        if (capUtil !== null && capUtil < 60) insights.push(`Room only ${capUtil}% full — boost pre-session promotion`);
        if (capUtil !== null && capUtil >= 95) insights.push(`Near/at capacity — explore larger room or add date`);
        if (!r.testimonialsCapt || r.testimonialsCapt === 0) insights.push("No testimonials captured — add ask at close");
        if (!r.followUpSent) insights.push("24h follow-up not sent yet");
        if (!r.rebookOfferSent) insights.push("Rebook offer not sent");
        if (r.referralsGenerated === 0) insights.push("No referrals generated — make the ask next time");
        if (r.noShows > 2) insights.push(`${r.noShows} no-shows — consider confirmation texts`);

        return (
          <div key={r.id} className="sb-card" style={{ borderLeft: `4px solid ${above ? "#4A8C6F" : net === 0 ? "#C0573F" : C.gold}`, cursor: "pointer" }}
            onClick={() => onOpen(r)}>
            <div style={{ padding: "14px 16px 12px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{cleanName(r.name)}</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{studio} · {fmtDate(r.date)}{r.time ? ` · ${r.time}` : ""} · {r.journey || ""}</div>
                </div>
                <Tag color={SESSION_STATUS_COLOR[r.status] || C.ink3} soft>{r.status || "—"}</Tag>
              </div>

              {/* Metrics row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8, marginBottom: insights.length ? 12 : 0 }}>
                {[
                  { label: "In room", val: `${r.attendance || 0}${r.capacity ? `/${r.capacity}` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : null },
                  { label: "Paid", val: r.paidAttendees || r.attendance || 0 },
                  { label: "Net rev", val: money(net), accent: above ? "#4A8C6F" : net === 0 ? "#C0573F" : null },
                  { label: "Rev/head", val: money(revPerHead) },
                  { label: "Conversion", val: pct(r.conversion), accent: convColor },
                  { label: "Pkgs sold", val: r.packagesSold || 0 },
                ].map(({ label, val, accent }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: accent || C.ink, marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>

              {/* Insights */}
              {insights.length > 0 && (
                <div style={{ background: hexA(C.gold, 0.08), borderRadius: 8, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: C.gold, marginBottom: 2 }}>What to improve</div>
                  {insights.map((ins, i) => (
                    <div key={i} style={{ fontSize: 12, color: C.ink2, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: C.gold }}>›</span> {ins}
                    </div>
                  ))}
                </div>
              )}
              {insights.length === 0 && r.status === "Closed out" && (
                <div style={{ fontSize: 12, color: "#4A8C6F", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <Check size={13} /> Session fully closed out — all post-session items complete.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION CHECKLIST
   ============================================================ */
/* ── EQUIPMENT & SETUP CHECKLIST COMPONENT ── */
function EquipmentChecklist({ equipChecklist, onChange, sessionName, sessionDate, isVirtual }) {
  const toggle = (id) => onChange({ ...equipChecklist, [id]: !equipChecklist[id] });

  const activePhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(i => isVirtual ? i.virtual : !i.virtual) }))
    .filter(p => p.items.length > 0);
  const allActiveItems = activePhases.flatMap(p => p.items);

  const done  = allActiveItems.filter(i => equipChecklist[i.id]).length;
  const total = allActiveItems.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  const criticalIds = isVirtual
    ? ["eq_zoom_account","eq_zoom_tested","eq_headset_v","eq_do_not_disturb","eq_contraindication"]
    : ["eq_headsets","eq_backup_headset","eq_playlist","eq_waiver_qr","eq_emergency","eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>
              {sessionName} — {isVirtual ? "Virtual Setup" : "Equipment & Setup"}
            </div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{done} of {total} items ready
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }} />
        </div>
      </div>

      {/* Critical items alert */}
      {criticalMissing.length > 0 && (
        <div style={{ background: hexA("#D9892B", 0.1), border: `1px solid ${hexA("#D9892B", 0.35)}`, borderRadius: 10, padding: "10px 14px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#9A5D10", marginBottom: 5 }}>⚠️ Critical items not yet checked</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {criticalMissing.map(id => {
              const item = allActiveItems.find(i => i.id === id);
              return item ? <span key={id} style={{ fontSize: 11, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 5, padding: "2px 8px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
            })}
          </div>
        </div>
      )}

      {/* Phase sections */}
      {activePhases.map(phase => {
        const phaseDone = phase.items.filter(i => equipChecklist[i.id]).length;
        const allDone   = phaseDone === phase.items.length;
        return (
          <div key={phase.id}>
            {/* Phase header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phase.color, 0.07) }}>
              <span style={{ fontSize: 16 }}>{phase.Icon ? <phase.Icon size={16} color={phase.color} strokeWidth={1.5} /> : null}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phase.color, flex: 1 }}>{phase.label}</span>
              {allDone
                ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
                : <span style={{ fontSize: 11, color: C.ink3 }}>{phaseDone}/{phase.items.length}</span>
              }
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {phase.items.map(item => {
                const checked   = !!equipChecklist[item.id];
                const isCritical = criticalIds.includes(item.id);
                return (
                  <button key={item.id} onClick={() => toggle(item.id)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(phase.color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px",
                    cursor: "pointer", transition: "background .12s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
                      border: `2px solid ${checked ? phase.color : isCritical && !checked ? "#D9892B" : C.line}`,
                      background: checked ? phase.color : C.surface,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                    {isCritical && !checked && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* All clear state */}
      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 22, marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All equipment and setup items are confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

// Sort items so critical ones appear first within any section
function sortCriticalFirst(items, criticalIds) {
  return [...items].sort((a, b) => {
    const aC = criticalIds.includes(a.id) ? 0 : 1;
    const bC = criticalIds.includes(b.id) ? 0 : 1;
    return aC - bC;
  });
}

/* ── VIRTUAL SESSION CHECKLIST (combined equipment + run) ── */
function VirtualSessionChecklist({ equipChecklist, onEquipChange, checklist, onChecklistChange, sessionName, sessionDate, status }) {
  const [showCritical, setShowCritical] = useState(false);
  const toggleEquip = (id) => onEquipChange({ ...equipChecklist, [id]: !equipChecklist[id] });
  const toggleRun   = (id) => onChecklistChange({ ...checklist, [id]: !checklist[id] });

  const activeEquipPhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(i => i.virtual) }))
    .filter(p => p.items.length > 0);
  const equipItems = activeEquipPhases.flatMap(p => p.items);
  const runItems   = SESSION_CHECKLIST.filter(i => i.virtual);

  const equipDone  = equipItems.filter(i => equipChecklist[i.id]).length;
  const runDone    = runItems.filter(i => checklist[i.id]).length;
  const totalDone  = equipDone + runDone;
  const total      = equipItems.length + runItems.length;
  const pct        = total ? Math.round((totalDone / total) * 100) : 0;

  // Items pulled from their equipment phases into the merged Pre-Session section
  const virtualPreSessionEquipIds = new Set([
    "eq_camera", "eq_do_not_disturb",   // from Virtual Setup
    "eq_playlist_v", "eq_wifi_v",        // from Content & Tech
  ]);

  const criticalIds     = ["eq_zoom_tested", "eq_headset_v", "eq_do_not_disturb", "eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);
  const isCompleted     = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  const renderItem = (item, checked, onToggle, color, isCritical, disabled) => (
    <button key={item.id} onClick={() => !disabled && onToggle(item.id)} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      background: checked ? hexA(color, 0.07) : "transparent",
      border: "none", borderRadius: 8, padding: "9px 10px",
      cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
        border: `2px solid ${checked ? color : isCritical && !checked ? "#D9892B" : C.line}`,
        background: checked ? color : C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
        {item.label}
      </span>
      {isCritical && !checked && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
      )}
    </button>
  );

  const renderPhaseHeader = (label, phColor, done, phTotal, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phColor, 0.07) }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: phColor, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phColor, flex: 1 }}>{label}</span>
      {extra}
      {done === phTotal
        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
        : <span style={{ fontSize: 11, color: C.ink3 }}>{done}/{phTotal}</span>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress header with critical badge */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — Virtual Setup</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{totalDone} of {total} items complete
            </div>
            {criticalMissing.length > 0 && (
              <button onClick={() => setShowCritical(v => !v)} style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                background: showCritical ? "#D9892B" : hexA("#D9892B", 0.12),
                border: `1px solid ${hexA("#D9892B", 0.4)}`,
                borderRadius: 20, padding: "3px 10px", cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, color: showCritical ? "#fff" : "#9A5D10",
                transition: "all .15s",
              }}>
                ⚠️ {criticalMissing.length} critical item{criticalMissing.length > 1 ? "s" : ""} not checked
                <span style={{ fontSize: 10 }}>{showCritical ? "▲" : "▼"}</span>
              </button>
            )}
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }} />
        </div>
        {showCritical && criticalMissing.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${hexA("#D9892B", 0.25)}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {criticalMissing.map(id => {
                const item = equipItems.find(i => i.id === id);
                return item ? <span key={id} style={{ fontSize: 11.5, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 6, padding: "3px 10px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Equipment phases — except Safety & Facilitation and items moved to Pre-Session */}
      {activeEquipPhases
        .filter(p => p.id !== "safety")
        .map(phase => ({ ...phase, items: phase.items.filter(i => !virtualPreSessionEquipIds.has(i.id)) }))
        .filter(phase => phase.items.length > 0)
        .map(phase => {
          const phaseDone = phase.items.filter(i => equipChecklist[i.id]).length;
          return (
            <div key={phase.id}>
              {renderPhaseHeader(phase.label, phase.color, phaseDone, phase.items.length, null)}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {sortCriticalFirst(phase.items, criticalIds).map(item => renderItem(item, !!equipChecklist[item.id], toggleEquip, phase.color, criticalIds.includes(item.id), false))}
              </div>
            </div>
          );
        })}

      {/* Pre-Session — run items + moved equip items + Safety & Facilitation merged */}
      {(() => {
        const safetyPhase = activeEquipPhases.find(p => p.id === "safety");
        const safetyItems = safetyPhase ? safetyPhase.items : [];
        const movedEquipItems = equipItems.filter(i => virtualPreSessionEquipIds.has(i.id));
        const preItems = runItems.filter(i => i.phase === "Pre-Session");
        const allPreItems = [...preItems, ...movedEquipItems, ...safetyItems];
        if (!allPreItems.length) return null;
        const phColor = SESSION_PHASE_COLOR["Pre-Session"];
        const done = preItems.filter(i => checklist[i.id]).length
                   + movedEquipItems.filter(i => equipChecklist[i.id]).length
                   + safetyItems.filter(i => equipChecklist[i.id]).length;
        const allSorted = sortCriticalFirst(
          [
            ...preItems.map(i => ({ ...i, _src: "run" })),
            ...movedEquipItems.map(i => ({ ...i, _src: "equip" })),
            ...safetyItems.map(i => ({ ...i, _src: "equip" })),
          ],
          criticalIds
        );
        return (
          <div>
            {renderPhaseHeader("Pre-Session", phColor, done, allPreItems.length, null)}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {allSorted.map(item =>
                item._src === "run"
                  ? renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), false)
                  : renderItem(item, !!equipChecklist[item.id], toggleEquip, phColor, criticalIds.includes(item.id), false)
              )}
            </div>
          </div>
        );
      })()}

      {/* Post-Session */}
      {(() => {
        const items = sortCriticalFirst(runItems.filter(i => i.phase === "Post-Session"), criticalIds);
        if (!items.length) return null;
        const phaseDone = items.filter(i => checklist[i.id]).length;
        const phColor = SESSION_PHASE_COLOR["Post-Session"];
        const disabled = !isCompleted;
        return (
          <div style={{ opacity: disabled ? 0.55 : 1 }}>
            {renderPhaseHeader("Post-Session", phColor, phaseDone, items.length,
              disabled ? <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span> : null
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map(item => renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), disabled))}
            </div>
          </div>
        );
      })()}

      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All setup and session items confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

/* ── STUDIO SESSION CHECKLIST (combined equipment + run) ── */
function StudioSessionChecklist({ equipChecklist, onEquipChange, checklist, onChecklistChange, sessionName, sessionDate, status }) {
  const [showCritical, setShowCritical] = useState(false);
  const toggleEquip = (id) => onEquipChange({ ...equipChecklist, [id]: !equipChecklist[id] });
  const toggleRun   = (id) => onChecklistChange({ ...checklist, [id]: !checklist[id] });

  const studioExcludeIds = new Set([
    "eq_speaker",       // Speaker / audio
    "eq_space_v",       // Personal space quiet
    "eq_lighting_v",    // Lighting flattering
    "promo_sent",       // Promotional push
    "equipment_packed", // Equipment packed
    "audio_tested",     // Music & headsets tested (replaced by tech_room_setup)
  ]);

  const activeEquipPhases = EQUIP_CHECKLIST_PHASES
    .map(p => ({ ...p, items: p.items.filter(i => !i.virtual && !studioExcludeIds.has(i.id)) }))
    .filter(p => p.items.length > 0);
  const equipItems = activeEquipPhases.flatMap(p => p.items);
  const runItems   = SESSION_CHECKLIST.filter(i => !i.virtual && !studioExcludeIds.has(i.id));

  const equipDone  = equipItems.filter(i => equipChecklist[i.id]).length;
  const runDone    = runItems.filter(i => checklist[i.id]).length;
  const totalDone  = equipDone + runDone;
  const total      = equipItems.length + runItems.length;
  const pct        = total ? Math.round((totalDone / total) * 100) : 0;

  const criticalIds     = ["eq_headsets","eq_backup_headset","eq_playlist","eq_waiver_qr","eq_emergency","eq_contraindication"];
  const criticalMissing = criticalIds.filter(id => !equipChecklist[id]);
  const isCompleted     = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  const renderItem = (item, checked, onToggle, color, isCritical, disabled) => (
    <button key={item.id} onClick={() => !disabled && onToggle(item.id)} disabled={disabled} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
      background: checked ? hexA(color, 0.07) : "transparent",
      border: "none", borderRadius: 8, padding: "9px 10px",
      cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: 5, flexShrink: 0, transition: "all .12s",
        border: `2px solid ${checked ? color : isCritical && !checked ? "#D9892B" : C.line}`,
        background: checked ? color : C.surface,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {checked && <Check size={12} color="#fff" strokeWidth={3} />}
      </div>
      <span style={{ fontSize: 13.5, flex: 1, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
        {item.label}
      </span>
      {isCritical && !checked && (
        <span style={{ fontSize: 10, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.12), borderRadius: 4, padding: "1px 6px" }}>CRITICAL</span>
      )}
    </button>
  );

  const renderPhaseHeader = (label, phColor, done, phTotal, extra) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "6px 10px", borderRadius: 8, background: hexA(phColor, 0.07) }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: phColor, flexShrink: 0 }} />
      <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color: phColor, flex: 1 }}>{label}</span>
      {extra}
      {done === phTotal
        ? <span style={{ fontSize: 11, fontWeight: 700, color: "#4A8C6F" }}>✓ All done</span>
        : <span style={{ fontSize: 11, color: C.ink3 }}>{done}/{phTotal}</span>}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress header with critical badge */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — Studio Setup</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {sessionDate ? `Session: ${sessionDate}  ·  ` : ""}{totalDone} of {total} items complete
            </div>
            {criticalMissing.length > 0 && (
              <button onClick={() => setShowCritical(v => !v)} style={{
                marginTop: 8, display: "inline-flex", alignItems: "center", gap: 5,
                background: showCritical ? "#D9892B" : hexA("#D9892B", 0.12),
                border: `1px solid ${hexA("#D9892B", 0.4)}`,
                borderRadius: 20, padding: "3px 10px", cursor: "pointer",
                fontSize: 11.5, fontWeight: 700, color: showCritical ? "#fff" : "#9A5D10",
                transition: "all .15s",
              }}>
                ⚠️ {criticalMissing.length} critical item{criticalMissing.length > 1 ? "s" : ""} not checked
                <span style={{ fontSize: 10 }}>{showCritical ? "▲" : "▼"}</span>
              </button>
            )}
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : pct >= 50 ? C.brand : C.gold }} />
        </div>
        {showCritical && criticalMissing.length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${hexA("#D9892B", 0.25)}` }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {criticalMissing.map(id => {
                const item = equipItems.find(i => i.id === id);
                return item ? <span key={id} style={{ fontSize: 11.5, background: "#fff", border: `1px solid ${hexA("#D9892B", 0.4)}`, borderRadius: 6, padding: "3px 10px", color: "#9A5D10", fontWeight: 600 }}>{item.label}</span> : null;
              })}
            </div>
          </div>
        )}
      </div>

      {/* Equipment phases — all except Safety & Facilitation */}
      {activeEquipPhases.filter(p => p.id !== "safety").map(phase => {
        const sortedItems = sortCriticalFirst(phase.items, criticalIds);
        const phaseDone = sortedItems.filter(i => equipChecklist[i.id]).length;
        return (
          <div key={phase.id}>
            {renderPhaseHeader(phase.label, phase.color, phaseDone, sortedItems.length, null)}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {sortedItems.map(item => renderItem(item, !!equipChecklist[item.id], toggleEquip, phase.color, criticalIds.includes(item.id), false))}
            </div>
          </div>
        );
      })}

      {/* Pre-Session — run items + Safety & Facilitation merged */}
      {(() => {
        const safetyPhase = activeEquipPhases.find(p => p.id === "safety");
        const safetyItems = safetyPhase ? safetyPhase.items : [];
        const preItems = runItems.filter(i => i.phase === "Pre-Session");
        const allPreItems = [...preItems, ...safetyItems];
        if (!allPreItems.length) return null;
        const phColor = SESSION_PHASE_COLOR["Pre-Session"];
        const done = preItems.filter(i => checklist[i.id]).length + safetyItems.filter(i => equipChecklist[i.id]).length;
        const allSorted = sortCriticalFirst(
          [
            ...preItems.map(i => ({ ...i, _src: "run" })),
            ...safetyItems.map(i => ({ ...i, _src: "equip" })),
          ],
          criticalIds
        );
        return (
          <div>
            {renderPhaseHeader("Pre-Session", phColor, done, allPreItems.length, null)}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {allSorted.map(item =>
                item._src === "run"
                  ? renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), false)
                  : renderItem(item, !!equipChecklist[item.id], toggleEquip, phColor, criticalIds.includes(item.id), false)
              )}
            </div>
          </div>
        );
      })()}

      {/* Post-Session */}
      {(() => {
        const items = sortCriticalFirst(runItems.filter(i => i.phase === "Post-Session"), criticalIds);
        if (!items.length) return null;
        const phaseDone = items.filter(i => checklist[i.id]).length;
        const phColor = SESSION_PHASE_COLOR["Post-Session"];
        const disabled = !isCompleted;
        return (
          <div style={{ opacity: disabled ? 0.55 : 1 }}>
            {renderPhaseHeader("Post-Session", phColor, phaseDone, items.length,
              disabled ? <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span> : null
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map(item => renderItem(item, !!checklist[item.id], toggleRun, phColor, criticalIds.includes(item.id), disabled))}
            </div>
          </div>
        );
      })()}

      {pct === 100 && (
        <div style={{ background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
          <div style={{ marginBottom: 6 }}><CheckCircle size={28} color="#4A8C6F" strokeWidth={1.5} /></div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2D6A50" }}>You're fully set up</div>
          <div style={{ fontSize: 12, color: "#4A8C6F", marginTop: 3 }}>All setup and session items confirmed. Go hold space. 🌿</div>
        </div>
      )}
    </div>
  );
}

function ClientSessionsTab({ record, data, onOpenRelated, today }) {
  const registrations = (data.registrations || [])
    .filter(r => r.clientId === record.id && r.status !== "canceled")
    .sort((a, b) => (b.date || b.sessionDate || "").localeCompare(a.date || a.sessionDate || ""));

  const sessions = registrations.map(reg => {
    const session = (data.sessions || []).find(s => s.id === reg.sessionId);
    return { reg, session };
  }).filter(({ session }) => session);

  const STATUS_COLOR = { Completed: "#4A8C6F", Planned: C.brand, "Booking open": C.brand, "Follow-up pending": C.gold, Canceled: "#C0573F" };

  // Revenue: full net for virtual (1:1); per-head net for studio sessions
  const sessionRevenue = ({ session }) => {
    if (!session) return 0;
    const net = Number(session.netRevenue) || 0;
    if (!session.studioId) return net; // virtual — full session revenue
    const heads = Math.max(Number(session.attendance) || 1, 1);
    return net / heads; // studio — per-head share
  };

  const totalRevenue = sessions.reduce((sum, s) => sum + sessionRevenue(s), 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions found for this client.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Summary row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: C.ink3 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(totalRevenue)} total revenue</span>
      </div>
      {sessions.map((item) => {
        const { reg, session } = item;
        const isVirtual = !session.studioId && (session.locationType === "zoom" || session.locationType === "custom" || !session.locationType);
        const partner = session.studioId ? (data.partners || []).find(p => p.id === session.studioId) : null;
        const statusColor = STATUS_COLOR[session.status] || C.ink3;
        const rev = sessionRevenue(item);
        return (
          <button key={session.id} onClick={() => onOpenRelated({ db: "sessions", record: session })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: isVirtual ? C.brand : LANE.b2b.color, flexShrink: 0, marginTop: 3 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(session.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {session.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(session.date)}{session.time ? ` · ${session.time}` : ""}</span>}
                {session.durationMins ? <span style={{ fontSize: 12, color: C.ink3 }}>{session.durationMins} min</span> : null}
                {partner && <span style={{ fontSize: 12, color: LANE.b2b.color, fontWeight: 600 }}>{cleanName(partner.name)}</span>}
                {session.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{session.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              {rev > 0 && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(rev)}</span>
              )}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {session.status || "Planned"}
              </span>
              {session.breakthroughNoted && (
                <span style={{ fontSize: 10, fontWeight: 700, color: "#4A8C6F", padding: "1px 6px", borderRadius: 8, background: hexA("#4A8C6F", 0.1) }}>Breakthrough</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function PartnerAgreementsTab({ agreements, onChange, partnerName }) {
  const fileRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const MAX_FILE_MB = 5;
  const ALLOWED_TYPES = new Set(["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);
  const ALLOWED_EXTS  = /\.(pdf|doc|docx)$/i;

  const handleUpload = (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_EXTS.test(file.name) && !ALLOWED_TYPES.has(file.type)) {
      setError("Only PDF or Word documents (.pdf, .doc, .docx) are allowed.");
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File must be under ${MAX_FILE_MB} MB.`);
      return;
    }
    setError("");
    setUploading(true);
    const reader = new FileReader();
    reader.onerror = () => { setError("Could not read file. Please try again."); setUploading(false); };
    reader.onload = (ev) => {
      const newAgreement = {
        id:         `agr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name:       file.name,
        size:       file.size,
        type:       file.type,
        uploadedAt: new Date().toISOString(),
        dataUrl:    ev.target.result,
      };
      onChange([...agreements, newAgreement]);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const remove = (id) => onChange(agreements.filter(a => a.id !== id));

  const open = (a) => {
    const w = window.open("", "_blank");
    if (!w) { alert("Pop-up blocked. Please allow pop-ups to view this file."); return; }
    if (a.type === "application/pdf" || a.name.toLowerCase().endsWith(".pdf")) {
      w.document.write(`<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; object-src 'self' data:;"><title>${a.name.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</title><style>body{margin:0;height:100vh;display:flex;flex-direction:column}embed{flex:1;width:100%}</style></head><body><embed src="${a.dataUrl}" type="application/pdf" /></body></html>`);
      w.document.close();
    } else {
      const link = w.document.createElement("a");
      link.href = a.dataUrl;
      link.download = a.name;
      w.document.body.appendChild(link);
      link.click();
      w.close();
    }
  };

  const fmtSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div style={{ padding: "0 22px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Upload button */}
      <div style={{ paddingTop: 4, display: "flex", alignItems: "center", gap: 12 }}>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={handleUpload} />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{
          display: "flex", alignItems: "center", gap: 7, padding: "8px 18px",
          borderRadius: 9, border: "none", cursor: uploading ? "wait" : "pointer",
          background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700,
        }}>
          <Upload size={14} /> {uploading ? "Uploading…" : "Upload Agreement"}
        </button>
        <span style={{ fontSize: 11.5, color: C.ink3 }}>PDF or Word only (.pdf, .doc, .docx) · max {MAX_FILE_MB} MB</span>
      </div>

      {error && (
        <div style={{ fontSize: 12.5, color: "#C0392B", background: hexA("#C0392B", 0.07), border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 8, padding: "8px 12px" }}>
          {error}
        </div>
      )}

      {/* Agreement list */}
      {agreements.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13.5 }}>
          <FileSignature size={32} color={C.line} style={{ display: "block", margin: "0 auto 10px" }} />
          No agreements uploaded yet for {partnerName}.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {agreements.map(a => (
            <div key={a.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: C.surfaceAlt, border: `1px solid ${C.line}`,
              borderRadius: 10, padding: "11px 14px",
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: hexA("#C0392B", 0.1), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <FileSignature size={17} color="#C0392B" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>
                  {fmtSize(a.size)} · Uploaded {a.uploadedAt ? new Date(a.uploadedAt).toLocaleDateString() : "—"}
                </div>
              </div>
              <button onClick={() => open(a)} title="Open file" style={{
                background: "#EBF3FF", border: "1px solid #BFDBFE", color: "#2563EB",
                borderRadius: 7, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
              }}>
                <Download size={12} /> Open
              </button>
              <button onClick={() => remove(a.id)} title="Remove" style={{
                background: "none", border: "none", cursor: "pointer", color: C.ink3,
                padding: 6, borderRadius: 7, flexShrink: 0,
                display: "flex", alignItems: "center",
              }}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: C.ink3, marginTop: 4 }}>
        Files are stored locally in your encrypted data store and are included in CSV exports.
      </div>
    </div>
  );
}

function PartnerSessionsTab({ record, data, onOpenRelated, today }) {
  const sessions = (data.sessions || [])
    .filter(s => s.studioId === record.id)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalNet   = sessions.reduce((s, x) => s + (Number(x.netRevenue)   || 0), 0);
  const totalGross = sessions.reduce((s, x) => s + (Number(x.revenue)      || 0), 0);
  const totalSplit = sessions.reduce((s, x) => s + (Number(x.studioSplit)  || 0), 0);

  if (!sessions.length) {
    return <div style={{ padding: "32px 0", textAlign: "center", color: C.ink3, fontSize: 13 }}>No sessions logged for this studio yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Totals summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", marginBottom: 4 }}>
        {[
          { label: "Total Gross", val: money(totalGross), color: C.ink },
          { label: "Studio Split", val: money(totalSplit), color: C.gold },
          { label: "Total Net", val: money(totalNet), color: "#4A8C6F" },
        ].map(({ label, val, color }) => (
          <div key={label}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color, marginTop: 2 }}>{val}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: C.ink3, marginBottom: 2 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""}</div>

      {sessions.map(s => {
        const net   = Number(s.netRevenue)  || 0;
        const gross = Number(s.revenue)     || 0;
        const split = Number(s.studioSplit) || 0;
        const isPast = s.date && s.date < today;
        const statusColor = SESSION_STATUS_COLOR[s.status] || C.ink3;
        return (
          <button key={s.id} onClick={() => onOpenRelated({ db: "sessions", record: s })}
            style={{ display: "flex", alignItems: "flex-start", gap: 12, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "12px 14px", textAlign: "left", cursor: "pointer", width: "100%" }}
            className="sb-relrow">
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cleanName(s.name)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 3, alignItems: "center" }}>
                {s.date && <span style={{ fontSize: 12, color: C.ink3 }}>{fmtDate(s.date)}{s.time ? ` · ${s.time}` : ""}</span>}
                {s.attendance != null && <span style={{ fontSize: 12, color: C.ink3 }}>{s.attendance} attended</span>}
                {s.journey && <span style={{ fontSize: 11, padding: "1px 7px", borderRadius: 10, background: hexA(C.brand, 0.1), color: C.brand, fontWeight: 600 }}>{s.journey}</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
              {gross > 0 && <span style={{ fontSize: 12, color: C.ink3 }}>Gross: {money(gross)}</span>}
              {split > 0 && <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>Split: {money(split)}</span>}
              {net > 0 && <span style={{ fontSize: 13, fontWeight: 700, color: "#4A8C6F" }}>{money(net)} net</span>}
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8, background: hexA(statusColor, 0.12), color: statusColor }}>
                {s.status || "Planned"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function SessionBookingsTab({ record, data, onOpenRelated }) {
  const registrations = (data.registrations || []).filter(r => r.sessionId === record.id);
  const REG_STATUS_COLOR = { booked: C.brand, attended: "#4A8C6F", canceled: "#C0573F", rescheduled: C.gold, no_show: "#8A96AC" };

  const studio = (data.partners || []).find(p => p.id === record.studioId);

  const downloadParticipantList = () => {
    const esc = (v) => String(v || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
    const studioName = esc(studio?.name || "—");
    const sessionName = esc(record.name || "Session");
    const sessionDate = esc(record.date ? fmtDate(record.date) : "—");
    const sessionTime = esc(record.time || "—");

    const active = registrations.filter(r => r.status !== "canceled");

    const rows = active.map((reg, i) => {
      const client = (data.clients || []).find(c => c.id === reg.clientId);
      const name   = esc(cleanName(client?.name || reg.name || "Unknown"));
      const email  = esc(client?.email || "—");
      const phone  = esc(client?.phone || "—");
      const status = esc(reg.status || "—");
      const waiver = reg.waiverStatus === "signed" ? "✓ Signed" : "Pending";
      const paid   = reg.paymentStatus === "paid" ? "✓ Paid" : reg.paymentStatus === "unpaid" ? "Unpaid" : "—";
      const rowBg  = i % 2 === 0 ? "#ffffff" : "#f8f9fc";
      return `<tr style="background:${rowBg}">
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${i + 1}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;font-weight:600">${name}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${email}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0">${phone}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;text-transform:capitalize">${status}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.waiverStatus === "signed" ? "#2D6A50" : "#9A5D10"}">${waiver}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e8eaf0;color:${reg.paymentStatus === "paid" ? "#2D6A50" : reg.paymentStatus === "unpaid" ? "#C0392B" : "#666"}">${paid}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
      <title>Participant List — ${sessionName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px 40px; color: #1a1d23; font-size: 13px; }
        .header { margin-bottom: 28px; border-bottom: 2px solid #2E6FB0; padding-bottom: 16px; }
        .logo { font-size: 20px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.5px; margin-bottom: 6px; }
        .meta { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 10px; }
        .meta-item { display: flex; flex-direction: column; }
        .meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #8a96ac; font-weight: 600; margin-bottom: 2px; }
        .meta-value { font-size: 13.5px; font-weight: 700; color: #1a1d23; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { background: #2E6FB0; color: #fff; padding: 9px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; }
        .footer { margin-top: 24px; font-size: 11px; color: #8a96ac; text-align: right; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <div class="header">
        <div class="logo">Simply Breathe</div>
        <div style="font-size:18px;font-weight:800;color:#1a1d23;margin-bottom:4px">${sessionName}</div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Studio</span><span class="meta-value">${studioName}</span></div>
          <div class="meta-item"><span class="meta-label">Date</span><span class="meta-value">${sessionDate}</span></div>
          <div class="meta-item"><span class="meta-label">Time</span><span class="meta-value">${sessionTime}</span></div>
          <div class="meta-item"><span class="meta-label">Registered</span><span class="meta-value">${active.length} participant${active.length !== 1 ? "s" : ""}</span></div>
        </div>
      </div>
      <table>
        <thead><tr>
          <th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Waiver</th><th>Payment</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">Generated ${new Date().toLocaleString()} · Simply Breathe OS</div>
      <script>window.onload=function(){window.print();}<\/script>
    </body></html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) { alert("Pop-up blocked. Please allow pop-ups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
  };

  if (!registrations.length) {
    return (
      <div style={{ padding: "32px 22px", textAlign: "center", color: C.ink3, fontSize: 14 }}>
        No bookings linked to this session yet.<br />
        <span style={{ fontSize: 12 }}>Bookings sync automatically from Calendly.</span>
      </div>
    );
  }

  const counts = { booked: 0, attended: 0, canceled: 0, rescheduled: 0, no_show: 0 };
  registrations.forEach(r => { if (counts[r.status] != null) counts[r.status]++; });

  return (
    <div style={{ padding: "0 22px 22px" }}>
      {/* Summary row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18, paddingTop: 4, alignItems: "center" }}>
        {Object.entries(counts).filter(([,n]) => n > 0).map(([status, n]) => (
          <div key={status} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5,
            padding: "5px 12px", borderRadius: 20,
            background: hexA(REG_STATUS_COLOR[status] || C.ink3, 0.1),
            color: REG_STATUS_COLOR[status] || C.ink3, fontWeight: 600 }}>
            <span style={{ fontWeight: 800 }}>{n}</span> {status}
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length > 0 && (
            <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>
              ⚠ {registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length} waiver{registrations.filter(r => r.waiverStatus !== "signed" && r.status !== "canceled").length !== 1 ? "s" : ""} pending
            </span>
          )}
          {record.studioId && (
            <button onClick={downloadParticipantList} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12.5,
              fontWeight: 700, background: C.brand, color: "#fff",
            }}>
              <Download size={13} /> Participant List
            </button>
          )}
        </div>
      </div>

      {/* Booking rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {registrations.map(reg => {
          const client = (data.clients || []).find(c => c.id === reg.clientId);
          const statusColor = REG_STATUS_COLOR[reg.status] || C.ink3;
          return (
            <div key={reg.id} style={{
              background: C.surfaceAlt, borderRadius: 12, padding: "12px 14px",
              border: `1px solid ${C.line}`, display: "flex", alignItems: "flex-start", gap: 12,
            }}>
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.brandSoft,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                {(client?.name || reg.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>
                    {cleanName(client?.name || "Unknown client")}
                  </span>
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20,
                    background: hexA(statusColor, 0.12), color: statusColor, fontWeight: 600 }}>
                    {reg.status}
                  </span>
                  {reg.waiverStatus === "signed"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Waiver</span>
                    : reg.status !== "canceled" && <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>⚠ Waiver pending</span>}
                  {reg.paymentStatus === "paid"
                    ? <span style={{ fontSize: 11, color: "#4A8C6F", fontWeight: 600 }}>✓ Paid</span>
                    : reg.paymentStatus === "unpaid" && <span style={{ fontSize: 11, color: "#C0573F", fontWeight: 600 }}>Unpaid</span>}
                </div>
                <div style={{ fontSize: 12, color: C.ink3, marginTop: 3, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {client?.email && <span>{client.email}</span>}
                  {client?.phone && <span>{client.phone}</span>}
                  {reg.attendanceType && <span>{reg.attendanceType}</span>}
                  {reg.locationType === "zoom" && reg.locationJoinUrl && reg.locationJoinUrl.startsWith("https://") && (
                    <a href={reg.locationJoinUrl} target="_blank" rel="noreferrer noopener"
                      style={{ color: C.brand, fontWeight: 600 }}>Zoom link</a>
                  )}
                </div>
                {reg.concerns && (
                  <div style={{ fontSize: 11.5, color: "#C0573F", marginTop: 4, fontWeight: 500 }}>
                    ⚠ {reg.concerns}
                  </div>
                )}
                {reg.howHeard && (
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>Heard via: {reg.howHeard}</div>
                )}
              </div>
              {client && (
                <button onClick={() => onOpenRelated({ db: "clients", record: client })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4, flexShrink: 0 }}
                  title="Open client record">
                  <ArrowUpRight size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SessionChecklist({ checklist, onChange, sessionName, status, isVirtual }) {
  const toggle = (id) => onChange({ ...checklist, [id]: !checklist[id] });
  const activeItems = SESSION_CHECKLIST.filter(i => isVirtual ? i.virtual : !i.virtual);
  const done = activeItems.filter(i => checklist[i.id]).length;
  const total = activeItems.length;
  const pctDone = total ? Math.round((done / total) * 100) : 0;
  const isCompleted = ["Completed", "Follow-up pending", "Closed out"].includes(status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{sessionName} — Run Checklist</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{done} of {total} items complete</div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 700, color: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }}>
            {pctDone}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .3s", width: pctDone + "%",
            background: pctDone === 100 ? "#4A8C6F" : pctDone >= 50 ? C.brand : C.gold }} />
        </div>
      </div>

      {SESSION_CHECKLIST_PHASES.map((phase) => {
        const items = activeItems.filter((i) => i.phase === phase);
        if (!items.length) return null;
        const phaseDone = items.filter((i) => checklist[i.id]).length;
        const color = SESSION_PHASE_COLOR[phase];
        const isPost = phase === "Post-Session";
        return (
          <div key={phase} style={{ opacity: isPost && !isCompleted ? 0.55 : 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em", color }}>{phase}</span>
              {isPost && !isCompleted && <span style={{ fontSize: 11, color: C.ink3 }}>(available after session is Completed)</span>}
              <span style={{ fontSize: 11, color: C.ink3, marginLeft: "auto" }}>{phaseDone}/{items.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {items.map((item) => {
                const checked = !!checklist[item.id];
                const disabled = isPost && !isCompleted;
                return (
                  <button key={item.id} onClick={() => !disabled && toggle(item.id)} disabled={disabled} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: checked ? hexA(color, 0.07) : "transparent",
                    border: "none", borderRadius: 8, padding: "9px 10px",
                    cursor: disabled ? "not-allowed" : "pointer", transition: "background .12s",
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 5, border: `2px solid ${checked ? color : C.line}`,
                      background: checked ? color : C.surface, display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, transition: "all .12s",
                    }}>
                      {checked && <Check size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13.5, fontWeight: checked ? 500 : 400, color: checked ? C.ink3 : C.ink, textDecoration: checked ? "line-through" : "none" }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   SESSION PERFORMANCE (drawer tab)
   ============================================================ */
function SessionPerformance({ record: r, derived, data }) {
  const net = Number(r.netRevenue) || 0;
  const gross = Number(r.revenue) || 0;
  const split = Number(r.studioSplit) || 0;
  const capUtil = r.capacity ? Math.round(((r.attendance || 0) / r.capacity) * 100) : null;
  const revPerHead = r.attendance ? (net / r.attendance).toFixed(2) : 0;
  const fillRate = r.registered ? Math.round(((r.attendance || 0) / r.registered) * 100) : null;
  const studio = clientShort(derived.partnerName[r.studioId] || "");
  const studioFull = derived.partnerName[r.studioId] || "";

  const handleDownloadPDF = () => {
    // HTML-escape all user-supplied strings interpolated into document.write to prevent stored XSS
    const esc = s => String(s ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

    const sessionTitle = esc(cleanName(r.name || "Session"));
    const rows = [
      ["Status",          esc(r.status || "—")],
      ["Journey",         esc(r.journey || "—")],
      ["Studio",          esc(studioFull || "—")],
      ["Date & Time",     `${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}`],
      ["Capacity",        r.capacity || "—"],
      ["Registered",      r.registered || "—"],
      ["Attended",        `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`],
      ["Paid Attendees",  r.paidAttendees || r.attendance || 0],
      ["Waivers",         r.waivers || 0],
      ["No-shows",        r.noShows || 0],
      ["Gross Revenue",   `$${Number(gross).toFixed(2)}`],
      ["Studio Split",    `$${Number(split).toFixed(2)}`],
      ["Net Revenue",     `$${Number(net).toFixed(2)}`],
      ["Rev per Head",    `$${Number(revPerHead).toFixed(2)}`],
      ["Conversion Rate", r.conversion ? `${Math.round(r.conversion * 100)}%` : "—"],
      ["Packages Sold",   r.packagesSold || 0],
      ["Testimonials",    r.testimonialsCapt || 0],
      ["Referrals",       r.referralsGenerated || 0],
    ];

    const metricsHtml = rows.map(([label, val]) => `
      <div class="metric">
        <div class="metric-label">${label}</div>
        <div class="metric-val">${val}</div>
      </div>`).join("");

    const revenueHtml = gross > 0 ? `
      <div class="section">
        <div class="section-title">Revenue Breakdown</div>
        <table class="rev-table">
          <tr><td>Gross Revenue</td><td class="amt">$${gross.toFixed(2)}</td></tr>
          <tr><td>Studio Split</td><td class="amt minus">-$${split.toFixed(2)}</td></tr>
        </table>
      </div>` : "";

    const notesHtml = r.notes ? `
      <div class="section">
        <div class="section-title">Session Notes</div>
        <div class="notes">${esc(r.notes)}</div>
      </div>` : "";

    const studioEsc = esc(studioFull);
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';" />
  <title>Session Report — ${sessionTitle}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a2340; background: #fff; padding: 32px 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2E6FB0; padding-bottom: 14px; margin-bottom: 22px; }
    .brand { font-size: 18px; font-weight: 800; color: #2E6FB0; letter-spacing: -0.3px; }
    .brand-sub { font-size: 11px; color: #6b7a99; margin-top: 2px; }
    .session-title { font-size: 20px; font-weight: 800; color: #1a2340; margin-bottom: 2px; }
    .session-sub { font-size: 12px; color: #6b7a99; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7a99; font-weight: 700; margin-bottom: 10px; }
    .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 16px; background: #f5f7fb; border-radius: 10px; padding: 14px 16px; }
    .metric-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7a99; font-weight: 700; }
    .metric-val { font-size: 13px; font-weight: 600; color: #1a2340; margin-top: 1px; }
    .rev-table { width: 100%; border-collapse: collapse; background: #f5f7fb; border-radius: 10px; overflow: hidden; }
    .rev-table td { padding: 10px 14px; border-bottom: 1px solid #e3e8f0; font-size: 13px; }
    .amt { text-align: right; font-weight: 700; }
    .minus { color: #D9892B; }
    .net-row td { font-weight: 800; font-size: 14px; background: #eaf4ee; }
    .net { color: #4A8C6F; }
    .notes { background: #f5f7fb; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #3a4a6b; line-height: 1.6; font-style: italic; }
    .footer { margin-top: 32px; border-top: 1px solid #e3e8f0; padding-top: 10px; font-size: 10px; color: #9aaccb; text-align: center; }
    @media print { body { padding: 20px 28px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Simply Breathe</div>
      <div class="brand-sub">Session Performance Report</div>
    </div>
    <div style="text-align:right">
      <div class="session-title">${sessionTitle}</div>
      <div class="session-sub">${studioEsc ? studioEsc + " · " : ""}${esc(fmtDate(r.date))}${r.time ? " · " + esc(r.time) : ""}</div>
    </div>
  </div>
  <div class="section">
    <div class="section-title">Session Metrics</div>
    <div class="metrics-grid">${metricsHtml}</div>
  </div>
  ${revenueHtml}
  ${notesHtml}
  <div class="footer">Generated by Simply Breathe OS · ${new Date().toLocaleDateString()}</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { alert("Popup blocked — please allow popups for this site to download the PDF."); return; }
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 400);
  };

  // Benchmarks from all sessions
  const allSessions = data.sessions.filter((s) => s.id !== r.id && (Number(s.netRevenue) || 0) > 0);
  const avgNetAll = allSessions.length ? allSessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0) / allSessions.length : null;
  const avgConvAll = allSessions.filter((s) => s.conversion > 0).length
    ? allSessions.filter((s) => s.conversion > 0).reduce((a, s) => a + Number(s.conversion), 0) / allSessions.filter((s) => s.conversion > 0).length
    : null;

  const metrics = [
    { label: "Status",          val: r.status || "—", accent: SESSION_STATUS_COLOR[r.status] },
    { label: "Journey",         val: r.journey || "—" },
    { label: "Studio",          val: studio || "—" },
    { label: "Date & time",     val: `${fmtDate(r.date)}${r.time ? ` · ${r.time}` : ""}` },
    { label: "Capacity",        val: r.capacity || "—" },
    { label: "Registered",      val: r.registered || "—" },
    { label: "Attended",        val: `${r.attendance || 0}${capUtil !== null ? ` (${capUtil}% full)` : ""}`, accent: capUtil !== null && capUtil < 60 ? C.gold : capUtil >= 90 ? "#4A8C6F" : null },
    { label: "Paid attendees",  val: r.paidAttendees || r.attendance || 0 },
    { label: "Waivers",         val: r.waivers || 0 },
    { label: "No-shows",        val: r.noShows || 0, accent: (r.noShows || 0) > 2 ? C.gold : null },
    { label: "Gross revenue",   val: money(gross) },
    { label: "Studio split",    val: money(split), accent: C.gold },
    { label: "Your net",        val: money(net), accent: net > 0 ? "#4A8C6F" : "#C0573F" },
    { label: "Rev per head",    val: money(revPerHead) },
    { label: "Conversion rate", val: pct(r.conversion), accent: r.conversion >= 0.3 ? "#4A8C6F" : r.conversion >= 0.2 ? C.brand : C.gold },
    { label: "Packages sold",   val: r.packagesSold || 0 },
    { label: "Testimonials",    val: r.testimonialsCapt || 0, accent: (r.testimonialsCapt || 0) === 0 ? C.gold : null },
    { label: "Referrals",       val: r.referralsGenerated || 0 },
  ];

  const postItems = [
    { label: "Follow-up sent",     done: r.followUpSent },
    { label: "Rebook offer sent",  done: r.rebookOfferSent },
    { label: "Referrals requested",done: r.referralsRequested },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* PDF download — studio sessions only */}
      {r.studioId && (
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={handleDownloadPDF} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
            background: C.brand, color: "#fff", border: "none",
          }}>
            <Download size={14} strokeWidth={2} /> Download PDF
          </button>
        </div>
      )}
      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {metrics.map(({ label, val, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Revenue breakdown */}
      {gross > 0 && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 10 }}>Revenue breakdown</div>
          <div style={{ background: C.surfaceAlt, borderRadius: 10, overflow: "hidden" }}>
            {[
              { label: "Gross revenue", amount: gross, color: C.brand, pct: 100 },
              { label: "Studio split (out)", amount: -split, color: C.gold, pct: gross ? Math.round((split / gross) * 100) : 0 },
              { label: "Your net", amount: net, color: "#4A8C6F", pct: gross ? Math.round((net / gross) * 100) : 0 },
            ].map(({ label, amount, color, pct: p }) => (
              <div key={label} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.line}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color }}>{amount < 0 ? "-" : ""}{money(Math.abs(amount))}</span>
                </div>
                <div style={{ height: 5, background: C.line, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: p + "%", background: color, borderRadius: 5 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* vs. average */}
      {avgNetAll !== null && (
        <div style={{ background: net >= avgNetAll ? hexA("#4A8C6F", 0.08) : hexA(C.gold, 0.08), borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>vs. your average</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>This session net</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: net >= avgNetAll ? "#4A8C6F" : C.gold }}>{money(net)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg net ({allSessions.length} sessions)</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{money(Math.round(avgNetAll))}</div>
            </div>
            {avgConvAll !== null && <>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>This session conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: r.conversion >= avgConvAll ? "#4A8C6F" : C.gold }}>{pct(r.conversion)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: C.ink3 }}>Avg conversion</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.ink2 }}>{pct(avgConvAll)}</div>
              </div>
            </>}
          </div>
        </div>
      )}

      {/* Post-session actions */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 8 }}>Post-session actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {postItems.map(({ label, done }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: done ? hexA("#4A8C6F", 0.07) : hexA(C.gold, 0.07) }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? "#4A8C6F" : C.line, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {done && <Check size={12} color="#fff" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: done ? C.ink3 : C.ink, textDecoration: done ? "line-through" : "none" }}>{label}</span>
              {!done && <span style={{ marginLeft: "auto", fontSize: 11, color: C.gold, fontWeight: 600 }}>Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Equipment & notes */}
      {r.equipmentNeeded && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Equipment needed</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px" }}>{r.equipmentNeeded}</div>
        </div>
      )}
      {r.notes && (
        <div>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 6 }}>Session notes</div>
          <div style={{ fontSize: 13, color: C.ink2, background: C.surfaceAlt, borderRadius: 8, padding: "10px 12px", fontStyle: "italic", lineHeight: 1.5 }}>{r.notes}</div>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   PARTNER LAUNCH CHECKLIST
   ============================================================ */
function PartnerLaunchChecklist({ checklist, onChange, partnerName }) {
  const cl = checklist || emptyChecklist();
  const toggle = (id) => onChange({ ...cl, [id]: !cl[id] });

  const totalItems = PARTNER_CHECKLIST.length;
  const totalDone  = PARTNER_CHECKLIST.filter(i => !!cl[i.id]).length;
  const pct        = Math.round((totalDone / totalItems) * 100);

  // Determine active phase (first incomplete phase)
  const activePhaseId = PARTNER_CHECKLIST_PHASES.find(ph =>
    ph.items.some(i => !cl[i.id])
  )?.id || "post_event";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Overall progress header */}
      <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "16px 18px", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: C.ink }}>{partnerName}</div>
            <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>
              {totalDone} of {totalItems} launch items complete
            </div>
          </div>
          <div style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 700,
            color: pct === 100 ? "#4A8C6F" : pct >= 60 ? C.brand : C.gold }}>
            {pct}%
          </div>
        </div>
        <div style={{ height: 8, background: C.line, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 8, transition: "width .4s ease",
            width: pct + "%",
            background: pct === 100 ? "#4A8C6F" : `linear-gradient(90deg, ${C.brand}, #6B5CE7)`,
          }} />
        </div>
        {pct === 100 && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#4A8C6F", fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5 }}>
            <Check size={14} /> Fully launched — this partner is ready to run.
          </div>
        )}

        {/* Phase progress pills */}
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
          {PARTNER_CHECKLIST_PHASES.map(ph => {
            const done  = ph.items.filter(i => !!cl[i.id]).length;
            const total = ph.items.length;
            const complete = done === total;
            return (
              <div key={ph.id} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: complete ? ph.bg : C.surface,
                border: `1px solid ${complete ? ph.color : C.line}`,
              }}>
                <span style={{ fontSize: 12 }}>{ph.Icon ? <ph.Icon size={14} color={ph.color} strokeWidth={1.5} /> : null}</span>
                <span style={{ fontSize: 11.5, fontWeight: 600,
                  color: complete ? ph.color : C.ink3 }}>
                  {ph.label}
                </span>
                <span style={{ fontSize: 11, color: complete ? ph.color : C.ink3, opacity: 0.7 }}>
                  {done}/{total}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase sections — timeline style */}
      <div style={{ position: "relative" }}>
        {/* Vertical connecting line */}
        <div style={{
          position: "absolute", left: 19, top: 24, bottom: 24,
          width: 2, background: C.line, zIndex: 0,
        }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {PARTNER_CHECKLIST_PHASES.map((ph, phIdx) => {
            const phaseDone  = ph.items.filter(i => !!cl[i.id]).length;
            const phaseTotal = ph.items.length;
            const phaseComplete = phaseDone === phaseTotal;
            const isActive = ph.id === activePhaseId;
            const isPast   = PARTNER_CHECKLIST_PHASES.findIndex(p => p.id === activePhaseId) > phIdx;

            return (
              <div key={ph.id} style={{ position: "relative", zIndex: 1 }}>
                {/* Phase header row */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  {/* Phase dot */}
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                    background: phaseComplete ? ph.color : isActive ? ph.bg : C.surface,
                    border: `2px solid ${phaseComplete || isActive ? ph.color : C.line}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, boxShadow: isActive ? `0 0 0 3px ${ph.color}25` : "none",
                    transition: "all .2s",
                  }}>
                    {phaseComplete ? <Check size={16} color="#fff" strokeWidth={1.5} /> : (ph.Icon ? <ph.Icon size={16} color="#fff" strokeWidth={1.5} /> : null)}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: isActive || phaseComplete ? ph.color : C.ink3 }}>
                        {ph.label}
                      </span>
                      {isActive && !phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: ph.bg, color: ph.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                          Current
                        </span>
                      )}
                      {phaseComplete && (
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: ph.color, opacity: 0.7 }}>
                          Complete ✓
                        </span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ height: 4, background: C.line, borderRadius: 4, marginTop: 5, width: 120, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 4,
                        width: `${Math.round((phaseDone / phaseTotal) * 100)}%`,
                        background: ph.color, transition: "width .3s ease" }} />
                    </div>
                  </div>

                  <span style={{ fontSize: 12, color: phaseComplete ? ph.color : C.ink3, fontWeight: 600 }}>
                    {phaseDone}/{phaseTotal}
                  </span>
                </div>

                {/* Checklist items */}
                <div style={{ marginLeft: 52, display: "flex", flexDirection: "column", gap: 2 }}>
                  {ph.items.map(item => {
                    const checked = !!cl[item.id];
                    return (
                      <button key={item.id} onClick={() => toggle(item.id)} style={{
                        display: "flex", alignItems: "center", gap: 10, width: "100%",
                        textAlign: "left", padding: "8px 12px", borderRadius: 8,
                        background: checked ? hexA(ph.color, 0.07) : "transparent",
                        border: `1px solid ${checked ? hexA(ph.color, 0.2) : "transparent"}`,
                        cursor: "pointer", transition: "all .12s",
                      }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 5, flexShrink: 0,
                          border: `2px solid ${checked ? ph.color : C.line}`,
                          background: checked ? ph.color : C.surface,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all .15s",
                        }}>
                          {checked && <Check size={11} color="#fff" strokeWidth={3} />}
                        </div>
                        <span style={{
                          fontSize: 13.5, fontWeight: checked ? 400 : 500,
                          color: checked ? C.ink3 : C.ink,
                          textDecoration: checked ? "line-through" : "none",
                          flex: 1,
                        }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONTACT TIMELINE
   ============================================================ */
const TL_COLORS = {
  session:    C.brand,
  offer_sent: C.gold,
  offer_won:  "#4A8C6F",
  offer_lost: "#C0573F",
  followup:   "#7B68EE",
  referral:   C.gold,
  upcoming:   C.ink3,
  milestone:  C.brandDeep,
  email_sent: "#2563EB",
};

function tlEvent(date, type, title, detail, extra = {}) {
  return { date: date || "", type, title, detail, ...extra };
}

function buildClientTimeline(record, data, today) {
  const events = [];
  const clientOffers = data.offers.filter((o) => o.clientId === record.id);
  const clientFUs = data.followups.filter((f) => f.clientId === record.id);

  // First contact / lead added
  const firstDate = record.firstSession || record.nextSession || "";
  if (firstDate) {
    events.push(tlEvent(record.firstSession || "", "milestone",
      "First session attended",
      [record.source && `Source: ${record.source}`, record.packageType !== "None" && record.packageType && `Package: ${record.packageType}`].filter(Boolean).join(" · ") || "No package yet",
      { sub: record.notes || "" }));
  } else {
    events.push(tlEvent("", "milestone", "Lead added", `Source: ${record.source || "—"} · Status: ${record.status}`, { sub: record.notes || "" }));
  }

  // All sessions (we use firstSession as start, lastSession as most recent)
  if (record.lastSession && record.lastSession !== record.firstSession) {
    const count = Number(record.sessionsAttended) || 0;
    events.push(tlEvent(record.lastSession, "session",
      `Most recent session — session #${count}`,
      `${count} total session${count !== 1 ? "s" : ""} attended · LTV: ${money(record.lifetimeValue)}`));
  }

  // Offers
  clientOffers.forEach((o) => {
    events.push(tlEvent(o.dateOffered, "offer_sent",
      `${o.offerType} offer sent`,
      `${money(o.price)} · status: ${o.status}`,
      { offerId: o.id }));
    if (o.closeDate && o.status !== "Offered") {
      events.push(tlEvent(o.closeDate,
        o.status === "Accepted" ? "offer_won" : "offer_lost",
        `${o.offerType} ${o.status.toLowerCase()}`,
        o.status === "Accepted" ? `Payment received: ${money(o.price)}` : `Declined on ${fmtDate(o.closeDate)}`,
        { offerId: o.id }));
    }
  });

  // Follow-ups
  clientFUs.forEach((f) => {
    events.push(tlEvent(f.lastContact, "followup",
      `${f.futype} follow-up`,
      f.outcome || "Pending response",
      { pending: !f.outcome, nextAction: f.nextAction }));
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next session (future)
  if (record.nextSession && record.nextSession >= today) {
    events.push(tlEvent(record.nextSession, "upcoming",
      "Next session scheduled",
      fmtDate(record.nextSession, true),
      { future: true }));
  }

  // Referral status
  const pendingFU = clientFUs.find((f) => !f.outcome && f.nextAction);
  const highReferral = record.referral === "High";
  const isAdvocate = record.status === "Advocate";

  return {
    events: events.filter((e) => e.date || e.type === "milestone").sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Status",        value: record.status },
      { label: "Segment",       value: record.clientType || "—", accent: CLIENT_TYPE_COLOR[record.clientType] },
      { label: "Source",        value: record.source || "—" },
      { label: "First session", value: fmtDate(record.firstSession) || "Not yet" },
      { label: "Sessions",      value: `${record.sessionsAttended || 0} attended` },
      { label: "Package",       value: record.packageType || "None" },
      { label: "Lifetime value",value: money(record.lifetimeValue || 0) },
      { label: "Referral",      value: record.referral + " potential", accent: REFERRAL_COLOR[record.referral] },
      { label: "Open offers",   value: clientOffers.filter((o) => OPEN_STATUSES.includes(o.status)).length + " pending" },
      { label: "Intent tags",   value: (record.tags || []).join(", ") || "None set" },
      { label: "Testimonial",   value: isAdvocate ? "Advocate — request now" : highReferral ? "High potential — not yet requested" : "Not yet requested" },
      { label: "Next follow-up",value: pendingFU ? fmtDate(pendingFU.nextAction) : "None scheduled", accent: pendingFU && pendingFU.nextAction <= today ? "#C0573F" : null },
    ],
  };
}

function buildPartnerTimeline(record, data, derived, today) {
  const sessions = [...(derived.sessionsByStudio[record.id] || [])].sort((a, b) => a.date.localeCompare(b.date));
  const totalNet = sessions.reduce((a, s) => a + (Number(s.netRevenue) || 0), 0);
  const totalAttend = sessions.reduce((a, s) => a + (Number(s.attendance) || 0), 0);
  const avgAttend = sessions.length ? Math.round(totalAttend / sessions.length) : 0;

  const events = [];

  // Partnership milestone
  events.push(tlEvent(record.outreachDate || sessions[0]?.date || "", "milestone",
    `Partnership: ${record.stage}`,
    `${record.revShare || "Revenue share TBD"} · Contact: ${record.contact} (${record.role})`));

  // Outreach date (if different from first session)
  if (record.outreachDate) {
    events.push(tlEvent(record.outreachDate, "followup",
      "First outreach sent",
      `Initial contact with ${record.contact} · ${fmtStudioType(record.studioType)}`));
  }

  // Last touch
  if (record.lastTouch && record.lastTouch !== record.outreachDate) {
    events.push(tlEvent(record.lastTouch, "followup",
      "Last touchpoint",
      record.notes ? record.notes.slice(0, 100) : "Check notes for details"));
  };

  // All sessions as events
  sessions.forEach((s, i) => {
    events.push(tlEvent(s.date, "session",
      `Session ${i + 1}: ${cleanName(s.name)}`,
      `${s.attendance} in room · ${money(s.netRevenue)} net · ${pct(s.conversion)} conversion · ${s.packagesSold} pkg sold`,
      { notes: s.notes, sessionId: s.id }));
  });

  // Upcoming sessions
  const upcomingSessions = data.sessions.filter((s) => s.studioId === record.id && s.date >= today);
  upcomingSessions.forEach((s) => {
    if (!sessions.find((x) => x.id === s.id)) {
      events.push(tlEvent(s.date, "upcoming", `Upcoming: ${cleanName(s.name)}`, fmtDate(s.date, true), { future: true }));
    }
  });

  // Emails sent from CRM
  (record.emailHistory || []).forEach(entry => {
    const dateStr = entry.date ? entry.date.slice(0, 10) : "";
    events.push(tlEvent(dateStr, "email_sent",
      `Email sent: ${entry.templateName}`,
      `To: ${entry.to}`));
  });

  // Next action
  if (record.nextAction) {
    events.push(tlEvent(record.nextAction, "upcoming",
      `Next action scheduled`,
      `Follow up with ${record.contact}`,
      { future: record.nextAction >= today, pending: record.nextAction < today, nextAction: record.nextAction }));
  }

  return {
    events: events.sort((a, b) => (a.date || "0").localeCompare(b.date || "0")),
    summary: [
      { label: "Stage",             value: record.stage, accent: STAGE_COLOR[record.stage] },
      { label: "Studio type",       value: fmtStudioType(record.studioType) },
      { label: "Location",          value: record.location || "—" },
      { label: "Contact",           value: `${record.contact || "—"} (${record.role || "—"})` },
      { label: "Email",             value: record.email || "—" },
      { label: "Est. community",    value: record.estimatedCommunitySize ? Number(record.estimatedCommunitySize).toLocaleString() + " people" : "—" },
      { label: "Revenue potential", value: money(record.revenuePotential || 0), accent: C.brand },
      { label: "Close probability", value: record.closeProbability || "—", accent: CLOSE_PROB_COLOR[record.closeProbability] },
      { label: "Revenue share",     value: record.revShare || "TBD" },
      { label: "Contract status",   value: record.contractStatus || "None" },
      { label: "First outreach",    value: fmtDate(record.outreachDate) || "—" },
      { label: "Last touch",        value: fmtDate(record.lastTouch) || "—" },
      { label: "Next action",       value: fmtDate(record.nextAction) || "None scheduled", accent: record.nextAction && record.nextAction <= today ? "#C0573F" : null },
      { label: "Total sessions",    value: sessions.length + " logged" },
      { label: "Avg attendance",    value: avgAttend + " per session" },
      { label: "Total net revenue", value: money(totalNet), accent: C.brand },
      { label: "Emails sent",       value: (record.emailHistory || []).length + " from CRM" },
      { label: "Promotion",         value: record.promotionCommitments || "None noted" },
      { label: "Insurance",         value: record.insuranceReqs || "None noted" },
      { label: "Notes",             value: record.notes ? record.notes.slice(0, 80) + (record.notes.length > 80 ? "…" : "") : "—" },
    ],
  };
}

function ContactTimeline({ db, record, data, derived, today, onOpenRelated }) {
  const { events, summary } = db === "clients"
    ? buildClientTimeline(record, data, today)
    : buildPartnerTimeline(record, data, derived, today);

  const TL_ICON = {
    session:    <Wind size={13} />,
    offer_sent: <DollarSign size={13} />,
    offer_won:  <Check size={13} />,
    offer_lost: <X size={13} />,
    followup:   <Phone size={13} />,
    referral:   <Users size={13} />,
    upcoming:   <CalendarDays size={13} />,
    milestone:  <ArrowUpRight size={13} />,
    email_sent: <Send size={13} />,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px", background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px" }}>
        {summary.map(({ label, value, accent }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".07em", color: C.ink3, fontWeight: 700 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: accent || C.ink }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div>
        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em", color: C.ink3, fontWeight: 700, marginBottom: 12 }}>
          Timeline · {events.length} event{events.length !== 1 ? "s" : ""}
        </div>

        {events.length === 0
          ? <Empty pad>No events logged yet — add sessions, offers, and follow-ups to build this timeline.</Empty>
          : (
            <div style={{ position: "relative" }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 2, background: C.line, borderRadius: 2 }} />

              {events.map((ev, i) => {
                const color = TL_COLORS[ev.type] || C.ink3;
                const isFuture = ev.future || (ev.date && ev.date > today);
                return (
                  <div key={i} style={{ display: "flex", gap: 14, marginBottom: 18, opacity: isFuture ? 0.7 : 1 }}>
                    {/* Dot */}
                    <div style={{ flexShrink: 0, width: 32, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%", background: isFuture ? C.surfaceAlt : color,
                        border: `2px solid ${isFuture ? C.line : color}`, display: "flex", alignItems: "center",
                        justifyContent: "center", color: isFuture ? C.ink3 : "#fff", zIndex: 1, position: "relative",
                      }}>
                        {TL_ICON[ev.type]}
                      </div>
                    </div>

                    {/* Card */}
                    <div style={{
                      flex: 1, background: isFuture ? "transparent" : C.surface,
                      border: `1px solid ${isFuture ? C.lineSoft : C.line}`,
                      borderRadius: 10, padding: "10px 14px", marginBottom: 2,
                      borderLeft: isFuture ? undefined : `3px solid ${color}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.35 }}>{ev.title}</div>
                        {ev.date && (
                          <span style={{ fontSize: 11, color: isFuture ? C.ink3 : C.brand, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                            {isFuture ? "📅 " : ""}{fmtDate(ev.date)}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.ink2, marginTop: 3 }}>{ev.detail}</div>
                      {ev.sub && ev.sub.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.sub.length > 180 ? ev.sub.slice(0, 180) + "…" : ev.sub}
                        </div>
                      )}
                      {ev.notes && ev.notes.length > 0 && (
                        <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 5, fontStyle: "italic", lineHeight: 1.5, borderTop: `1px solid ${C.lineSoft}`, paddingTop: 6 }}>
                          {ev.notes.length > 180 ? ev.notes.slice(0, 180) + "…" : ev.notes}
                        </div>
                      )}
                      {ev.pending && ev.nextAction && (
                        <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600,
                          color: ev.nextAction <= today ? "#C0573F" : C.gold, background: ev.nextAction <= today ? hexA("#C0573F", 0.1) : C.goldSoft,
                          padding: "2px 8px", borderRadius: 6 }}>
                          <CalendarDays size={11} />
                          Next action: {fmtDate(ev.nextAction)}{ev.nextAction <= today ? " · overdue" : ""}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </div>
    </div>
  );
}

function FieldInput({ fld, value, onChange, data }) {
  const { type } = fld;
  const resolvedOptions = typeof fld.options === "function" ? fld.options() : (fld.options || []);
  let control;
  if (type === "dropdown") {
    control = (
      <div style={{ position: "relative" }}>
        <select
          value={value || ""}
          onChange={e => onChange(e.target.value)}
          style={{
            width: "100%", appearance: "none", WebkitAppearance: "none",
            padding: "8px 34px 8px 12px", borderRadius: 9,
            border: `1px solid ${C.line}`, background: C.surface,
            fontSize: 13.5, color: value ? C.ink : C.ink3,
            cursor: "pointer", outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          }}
        >
          <option value="">— select —</option>
          {resolvedOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown size={14} color={C.ink3} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    );
  } else if (type === "select") {
    control = (
      <div className="sb-chiprow">
        {resolvedOptions.map((o) => {
          const on = value === o;
          const cl = fld.key === "status" || fld.key === "stage" ? (STATUS_COLOR[o] || STAGE_COLOR[o]) : C.brand;
          return <button key={o} className="sb-selchip" onClick={() => onChange(o)}
            style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>{o}</button>;
        })}
      </div>
    );
  } else if (type === "multiselect") {
    const vals = Array.isArray(value) ? value : [];
    control = (
      <div className="sb-chiprow" style={{ flexWrap: "wrap" }}>
        {resolvedOptions.map((o) => {
          const on = vals.includes(o);
          const cl = fld.colorMap ? (fld.colorMap[o] || C.brand) : C.brand;
          return (
            <button key={o} className="sb-selchip" onClick={() => onChange(on ? vals.filter(v => v !== o) : [...vals, o])}
              style={{ background: on ? cl : C.surface, color: on ? "#fff" : C.ink2, borderColor: on ? cl : C.line }}>
              {o}
            </button>
          );
        })}
      </div>
    );
  } else if (type === "tagselector") {
    // Normalize: legacy string → array
    const selected = Array.isArray(value) ? value : (value ? [value] : []);
    const available = resolvedOptions.filter(o => !selected.includes(o));
    const [open, setOpen] = useState(false);
    const ref = useRef();
    useEffect(() => {
      if (!open) return;
      const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }, [open]);
    control = (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        {selected.map(tag => (
          <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px 4px 12px", borderRadius: 20, background: C.brandSoft, color: C.brandDeep, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.brand}` }}>
            {tag}
            <button onClick={() => onChange(selected.filter(t => t !== tag))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, color: C.brand, fontSize: 13, marginLeft: 2 }}>×</button>
          </span>
        ))}
        {available.length > 0 && (
          <div ref={ref} style={{ position: "relative" }}>
            <button onClick={() => setOpen(o => !o)} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 20, background: C.surface, color: C.ink2, fontSize: 12.5, fontWeight: 600, border: `1px solid ${C.line}`, cursor: "pointer" }}>
              <Plus size={12} /> Add type
            </button>
            {open && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,.10)", zIndex: 999, minWidth: 150, padding: "4px 0", overflow: "hidden" }}>
                {available.map(opt => (
                  <button key={opt} onClick={() => { onChange([...selected, opt]); setOpen(false); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: C.ink }}
                    onMouseEnter={e => e.currentTarget.style.background = C.brandSoft}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {selected.length === 0 && available.length === 0 && <span style={{ fontSize: 12.5, color: C.ink3 }}>—</span>}
      </div>
    );
  } else if (type === "relation") {
    control = (
      <select className="sb-input" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— none —</option>
        {data[fld.target].map((r) => <option key={r.id} value={r.id}>{cleanName(r.name)}</option>)}
      </select>
    );
  } else if (type === "textarea") {
    control = <textarea className="sb-input" rows={fld.rows || 3} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "checkbox") {
    control = (
      <div style={{ display: "flex", gap: 8 }}>
        {[true, false].map(v => (
          <button key={String(v)} onClick={() => onChange(v)} style={{
            padding: "6px 16px", borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: "pointer",
            background: value === v ? (v ? "#4A8C6F" : C.ink3) : C.surface,
            color: value === v ? "#fff" : C.ink2,
            border: `1px solid ${value === v ? (v ? "#4A8C6F" : C.ink3) : C.line}`,
          }}>{v ? "Yes ✓" : "No"}</button>
        ))}
      </div>
    );
  } else if (type === "date") {
    control = <input className="sb-input" type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  } else if (type === "number" || type === "currency" || type === "percent") {
    control = (
      <div style={{ position: "relative" }}>
        {type === "currency" && <span className="sb-affix" style={{ left: 10 }}>$</span>}
        <input className="sb-input" type="number" step={type === "percent" ? "0.01" : "any"}
          style={{ paddingLeft: type === "currency" ? 22 : 12 }}
          value={value === "" || value == null ? "" : value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} />
        {type === "percent" && <span className="sb-affix" style={{ right: 10 }}>{value !== "" && value != null ? pct(value) : "0–1"}</span>}
      </div>
    );
  } else {
    control = <input className="sb-input" type={type === "email" ? "email" : type === "phone" ? "tel" : "text"}
      value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className={"sb-field" + (type === "textarea" || type === "select" || type === "tagselector" || fld.wide ? " sb-field-wide" : "")}>
      <span className="sb-flabel">{fld.label}</span>
      {control}
    </label>
  );
}

/* ============================================================
   CSV IMPORT
   ============================================================ */
const IMPORT_MAP = {
  partners: { file: "02-Studio-Partners.csv", map: { "studio name": "name", location: "location", "contact name": "contact", role: "role", email: "email", phone: "phone", "partnership stage": "stage", "revenue share model": "revShare", "avg attendance": "avgAttendance", "sessions per month": "sessionsPerMonth", notes: "notes" }, nums: ["avgAttendance", "sessionsPerMonth"] },
  clients: { file: "01-Clients.csv", map: { name: "name", phone: "phone", email: "email", source: "source", status: "status", "first session date": "firstSession", "sessions attended": "sessionsAttended", "last session date": "lastSession", "next session date": "nextSession", "package type": "packageType", "lifetime value": "lifetimeValue", "emotional notes": "notes", "referral potential": "referral" }, nums: ["sessionsAttended", "lifetimeValue"] },
  sessions: { file: "03-Sessions.csv", map: { "session name": "name", studio: "_studio", date: "date", "attendance count": "attendance", revenue: "revenue", "your net revenue": "netRevenue", "conversion rate": "conversion", "packages sold": "packagesSold", "referrals generated": "referralsGenerated", notes: "notes" }, nums: ["attendance", "revenue", "netRevenue", "conversion", "packagesSold", "referralsGenerated"], rel: { field: "_studio", to: "partners", set: "studioId" } },
  offers: { file: "04-Offers-Sales.csv", map: { offer: "name", "client name": "_client", "offer type": "offerType", price: "price", status: "status", "date offered": "dateOffered", "close date": "closeDate" }, nums: ["price"], rel: { field: "_client", to: "clients", set: "clientId" } },
  content: { file: "05-Content-Referral.csv", map: { "content title": "name", type: "type", platform: "platform", "date posted": "datePosted", engagement: "engagement", "leads generated": "leads", "sessions booked": "booked" }, nums: ["engagement", "leads", "booked"] },
  followups: { file: "06-Follow-Ups.csv", map: { "follow-up": "name", "client name": "_client", stage: "stage", "last contact date": "lastContact", "follow-up type": "futype", "next action date": "nextAction", outcome: "outcome" }, rel: { field: "_client", to: "clients", set: "clientId" } },
  expenses: { file: "07-Expenses.csv", map: { date: "date", vendor: "vendor", description: "description", amount: "amount", category: "category", "payment method": "paymentMethod", "paymentmethod": "paymentMethod", "tax deductible": "taxDeductible", "taxdeductible": "taxDeductible", recurring: "recurring", "recurring freq": "recurringFreq", "recurringfreq": "recurringFreq", "linked session": "linkedSession", "linked partner": "linkedPartner", "receipt url": "receiptUrl", notes: "notes" }, nums: ["amount"] },
};
const DB_ORDER = ["partners", "clients", "sessions", "offers", "content", "followups", "expenses", "registrations"];

/* ============================================================
   EDIT PROFILE MODAL
   ============================================================ */
/* ============================================================
   ADMIN VIEW
   ============================================================ */

/* ============================================================
   EXPENSE SUMMARY VIEW
   ============================================================ */
function ExpenseSummaryView({ data, today, onOpen, onImportExpenses, canEdit = true }) {
  const expenses = data.expenses || [];
  const mo  = today.slice(0, 7);
  const yr  = today.slice(0, 4);

  const mtd  = expenses.filter(e => (e.date||"").startsWith(mo));
  const ytd  = expenses.filter(e => (e.date||"").startsWith(yr));
  const totMTD  = mtd.reduce((s,e) => s + (+e.amount||0), 0);
  const totYTD  = ytd.reduce((s,e) => s + (+e.amount||0), 0);
  const taxDed  = ytd.filter(e => e.taxDeductible).reduce((s,e) => s + (+e.amount||0), 0);
  const recurring = expenses.filter(e => e.recurring).reduce((s,e) => s + (+e.amount||0), 0);

  // By category
  const byCat = EXPENSE_CATEGORY.map(cat => {
    const rows = ytd.filter(e => e.category === cat);
    return { cat, total: rows.reduce((s,e) => s + (+e.amount||0), 0), count: rows.length };
  }).filter(c => c.total > 0).sort((a,b) => b.total - a.total);

  const maxCat = byCat[0]?.total || 1;

  // Vendor breakdown (top 8)
  const byVendor = Object.entries(
    ytd.reduce((acc, e) => { acc[e.vendor] = (acc[e.vendor]||0) + (+e.amount||0); return acc; }, {})
  ).map(([vendor, total]) => ({ vendor, total })).sort((a,b) => b.total - a.total).slice(0,8);

  // Monthly trend (last 6 months)
  const months = Array.from({length:6}, (_,i) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - (5-i));
    return d.toISOString().slice(0,7);
  });
  const monthlyData = months.map(m => ({
    label: new Date(m+"-01").toLocaleDateString("en-US",{month:"short"}),
    total: expenses.filter(e=>(e.date||"").startsWith(m)).reduce((s,e)=>s+(+e.amount||0),0),
  }));
  const maxMonth = Math.max(...monthlyData.map(m=>m.total), 1);

  // Revenue context for margin
  const netRevMTD = (data.revenue||[])
    .filter(r => (r.date||"").startsWith(mo))
    .reduce((s,r) => s + calcNet(r), 0);
  const opProfit = netRevMTD - totMTD;
  const margin = netRevMTD > 0 ? Math.round((opProfit / netRevMTD) * 100) : null;

  // CSV import instructions
  const csvCols = "date,vendor,description,amount,category,paymentMethod,taxDeductible,recurring,recurringFreq,notes";

  return (
    <div style={{maxWidth:1100,margin:"0 auto"}}>
      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14,marginBottom:24}}>
        {[
          { label:"Expenses MTD",      value: money(totMTD),           sub: "this month", color: "#EF4444" },
          { label:"Expenses YTD",      value: money(totYTD),           sub: "this year",  color: C.ink2 },
          { label:"Tax Deductible YTD",value: money(taxDed),           sub: `${totYTD>0?Math.round(taxDed/totYTD*100):0}% of total`, color:"#16A34A" },
          { label:"Recurring / mo",    value: money(recurring),        sub: "committed monthly", color: "#8E44AD" },
          { label:"Operating Margin",  value: margin !== null ? margin+"%" : "—", sub: `Profit: ${money(opProfit)} MTD`, color: opProfit >= 0 ? "#16A34A" : "#EF4444" },
        ].map(s => (
          <div key={s.label} style={{background:C.surface,borderRadius:14,padding:"16px 18px",border:`1px solid ${C.line}`}}>
            <div style={{fontSize:11,color:C.ink3,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
            <div style={{fontSize:26,fontWeight:700,color:s.color,margin:"6px 0 2px",fontFamily:FONT.display}}>{s.value}</div>
            <div style={{fontSize:11,color:C.ink3}}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        {/* Category breakdown */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Spend by Category — YTD</div>
          {byCat.length === 0 ? <div style={{color:C.ink3,fontSize:13}}>No data</div> : byCat.map(c => (
            <div key={c.cat} style={{marginBottom:11}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:C.ink,fontWeight:600}}>{c.cat} <span style={{color:C.ink3,fontWeight:400}}>({c.count})</span></span>
                <span style={{color:EXPENSE_CATEGORY_COLOR[c.cat]||C.ink3,fontWeight:700}}>{money(c.total)}</span>
              </div>
              <div style={{height:7,background:C.line,borderRadius:4}}>
                <div style={{height:"100%",width:(c.total/maxCat*100)+"%",background:EXPENSE_CATEGORY_COLOR[c.cat]||C.brand,borderRadius:4}}/>
              </div>
            </div>
          ))}
        </div>

        {/* Monthly trend */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Monthly Trend</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:8,height:130}}>
            {monthlyData.map(m => (
              <div key={m.label} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:11,color:C.ink3,fontWeight:600}}>{m.total>0?money(m.total):""}</div>
                <div style={{width:"100%",background:C.brand,borderRadius:"4px 4px 0 0",height:Math.max(4,Math.round((m.total/maxMonth)*90))+"px"}}/>
                <div style={{fontSize:11,color:C.ink3}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
        {/* Top vendors */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Top Vendors — YTD</div>
          {byVendor.map((v,i) => (
            <div key={v.vendor} style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
              <span style={{fontSize:11,fontWeight:700,color:C.ink3,width:16,textAlign:"right"}}>{i+1}</span>
              <span style={{flex:1,fontSize:13,color:C.ink}}>{v.vendor}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.ink}}>{money(v.total)}</span>
            </div>
          ))}
        </div>

        {/* Margin summary */}
        <div style={{background:C.surface,borderRadius:16,border:`1px solid ${C.line}`,padding:"18px 20px"}}>
          <div style={{fontWeight:700,fontSize:14,color:C.ink,marginBottom:14}}>Profitability — MTD</div>
          {[
            { label:"Gross Revenue MTD",    value: (data.sessions||[]).filter(s=>(s.date||"").startsWith(mo)&&s.status==="Completed").reduce((s,r)=>s+(+r.grossRevenue||0),0), positive:true },
            { label:"Studio Splits MTD",    value: -(data.sessions||[]).filter(s=>(s.date||"").startsWith(mo)&&s.status==="Completed").reduce((s,r)=>s+(+r.studioSplit||0),0), positive:false },
            { label:"Net Revenue MTD",      value: netRevMTD, positive:true, bold:true },
            { label:"Total Expenses MTD",   value: -totMTD,   positive:false },
            { label:"Operating Profit MTD", value: opProfit,  positive:opProfit>=0, bold:true, big:true },
          ].map(r => (
            <div key={r.label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.line}`,fontSize:r.big?15:13}}>
              <span style={{color:r.bold?C.ink:C.ink3,fontWeight:r.bold?700:400}}>{r.label}</span>
              <span style={{fontWeight:r.bold||r.big?700:600,color:r.value>=0?"#16A34A":"#EF4444"}}>{r.value>=0?money(r.value):"-"+money(Math.abs(r.value))}</span>
            </div>
          ))}
          {margin !== null && (
            <div style={{marginTop:10,textAlign:"center",fontSize:12,color:C.ink3}}>
              Operating margin: <strong style={{color:margin>=0?"#16A34A":"#EF4444"}}>{margin}%</strong>
            </div>
          )}
        </div>
      </div>

      {/* CSV import guide */}
      <div style={{background:C.surface,borderRadius:16,border:`2px solid ${C.brand}`,padding:"20px 22px"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:10}}>
          <div style={{fontWeight:700,fontSize:15,color:C.ink,display:"flex",alignItems:"center",gap:8}}>
            <Upload size={17} color={C.brand} /> Bulk Import via CSV
          </div>
          {canEdit && (
          <label style={{
            display:"inline-flex",alignItems:"center",gap:7,padding:"9px 18px",borderRadius:10,
            background:C.brand,color:"#fff",fontWeight:700,fontSize:13.5,cursor:"pointer",
            boxShadow:`0 2px 8px ${hexA(C.brand,0.35)}`,
          }}>
            <Upload size={15} /> Upload Expense CSV
            <input type="file" accept=".csv" style={{display:"none"}} onChange={(e) => {
              if (e.target.files[0] && onImportExpenses) onImportExpenses(e.target.files[0]);
            }} />
          </label>
          )}
        </div>
        <div style={{fontSize:13,color:C.ink3,marginBottom:12,lineHeight:1.7}}>
          Export your expenses from your bank, credit card statement, QuickBooks, Wave, or Xero as a CSV — then click <strong style={{color:C.ink}}>Upload Expense CSV</strong> above to import all rows at once.
        </div>
        <div style={{fontWeight:600,fontSize:12,color:C.ink2,marginBottom:6}}>Required CSV column headers (in any order):</div>
        <div style={{fontFamily:"monospace",fontSize:12,background:C.surfaceAlt,padding:"10px 14px",borderRadius:10,color:C.brand,wordBreak:"break-all",marginBottom:12}}>{csvCols}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,fontSize:12,color:C.ink3}}>
          <div><strong style={{color:C.ink2}}>date</strong> — YYYY-MM-DD format (e.g. 2026-06-15)</div>
          <div><strong style={{color:C.ink2}}>amount</strong> — number only, no $ sign (e.g. 49.99)</div>
          <div><strong style={{color:C.ink2}}>category</strong> — must match an allowed category exactly</div>
          <div><strong style={{color:C.ink2}}>taxDeductible</strong> — true or false</div>
          <div><strong style={{color:C.ink2}}>recurring</strong> — true or false</div>
          <div><strong style={{color:C.ink2}}>recurringFreq</strong> — One-time, Monthly, Quarterly, or Annual</div>
        </div>
        <div style={{marginTop:12,fontSize:12,color:C.ink3,fontStyle:"italic"}}>
          Tip: Export directly from QuickBooks, Wave, or your bank statement. Rename the columns to match the headers above before importing.
        </div>
      </div>
    </div>
  );
}

const DB_SCHEMA = [
  {
    table: "clients", label: "Clients", lane: "B2C",
    description: "Individual clients — leads, attendees, members, and advocates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Full name" },
      { name: "email",           type: "email",    required: false, description: "Contact email address" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "source",          type: "select",   required: false, description: "How the client found Simply Breathe", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "type",            type: "select",   required: false, description: "Client classification", values: "First-time attendee · Repeat attendee · Member · Advocate · Referral source · Private client · Studio attendee · Virtual attendee · Corporate attendee · High-value lead · Past client – reactivate" },
      { name: "tags",            type: "array",    required: false, description: "Intent / emotional tags", values: "Stress relief · Anxiety · Burnout · Performance · Grief · Letting go · Self-confidence · Nervous system reset · Transformation seeker · Spiritual growth · Corporate wellness" },
      { name: "firstContact",    type: "date",     required: false, description: "Date of first contact (ISO 8601)" },
      { name: "lastSession",     type: "date",     required: false, description: "Date of most recent session attended" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Scheduled next follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Relationship status", values: "New lead · Active · Warm · VIP · Advocate · Inactive · Lost" },
      { name: "referralSource",  type: "string",   required: false, description: "Name of the person who referred this client" },
      { name: "referralPotential", type: "select", required: false, description: "Likelihood to refer others", values: "High · Medium · Low" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "partners", label: "Studio Partners", lane: "B2B",
    description: "Studios, gyms, and wellness spaces that host breathwork events.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Studio or business name" },
      { name: "owner",           type: "string",   required: false, description: "Owner or manager name" },
      { name: "email",           type: "email",    required: false, description: "Primary contact email" },
      { name: "phone",           type: "string",   required: false, description: "Phone number" },
      { name: "location",        type: "string",   required: false, description: "City / address" },
      { name: "type",            type: "select",   required: false, description: "Studio category", values: "Yoga · Gym · Meditation · Wellness · Pilates · Corporate · Other" },
      { name: "communitySize",   type: "number",   required: false, description: "Estimated active member / follower count" },
      { name: "bestJourney",     type: "string",   required: false, description: "Best-fit breathwork journey for this audience" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated total revenue potential ($)" },
      { name: "stage",           type: "select",   required: false, description: "Pipeline stage", values: "Target Identified · Researched · Initial Outreach Sent · Follow-Up Needed · Discovery Call Booked · Demo Session Offered · Demo Completed · Pilot Proposed · Agreement Sent · Agreement Signed · First Session Scheduled · Pilot Completed · Recurring Partner · Lost / Not a Fit" },
      { name: "probability",     type: "number",   required: false, description: "Probability of closing (0–100%)" },
      { name: "lastTouch",       type: "date",     required: false, description: "Date of last activity or contact" },
      { name: "nextAction",      type: "string",   required: false, description: "Next required action" },
      { name: "contractStatus",  type: "select",   required: false, description: "Agreement status", values: "None · Sent · Signed · Expired" },
      { name: "insuranceReq",    type: "string",   required: false, description: "Insurance requirements noted" },
      { name: "promotionCommit", type: "string",   required: false, description: "Agreed promotion commitments" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes and conversation history" },
      { name: "checklist",       type: "object",   required: false, description: "Studio Launch Checklist — 4-phase, 23 boolean items (before_signing, after_signing, before_event, after_event)" },
    ],
  },
  {
    table: "sessions", label: "Sessions", lane: "B2C",
    description: "Individual breathwork events — studio, virtual, or private.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Session date (ISO 8601)" },
      { name: "time",            type: "string",   required: false, description: "Session start time" },
      { name: "studio",          type: "string",   required: false, description: "Studio name or 'Virtual'" },
      { name: "journey",         type: "string",   required: false, description: "Breathwork journey used" },
      { name: "status",          type: "select",   required: false, description: "Lifecycle status", values: "Planned · Booking Open · Promotion Active · Almost Full · Completed · Follow-Up Pending · Closed Out" },
      { name: "capacity",        type: "number",   required: false, description: "Maximum attendee capacity" },
      { name: "registered",      type: "number",   required: false, description: "Number registered" },
      { name: "paid",            type: "number",   required: false, description: "Number who paid" },
      { name: "waivers",         type: "number",   required: false, description: "Number of waivers completed" },
      { name: "noShows",         type: "number",   required: false, description: "Number of no-shows" },
      { name: "grossRevenue",    type: "currency",  required: false, description: "Total gross revenue collected ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Amount paid to studio ($)" },
      { name: "netRevenue",      type: "currency",  required: false, description: "Net revenue after studio split ($)" },
      { name: "roomSetup",       type: "select",   required: false, description: "Room setup status", values: "Not started · In progress · Complete" },
      { name: "audioSetup",      type: "select",   required: false, description: "Music / headset setup status", values: "Not started · In progress · Complete" },
      { name: "testimonialsCapt",type: "boolean",  required: false, description: "Were testimonials captured post-session?" },
      { name: "followUpSent",    type: "boolean",  required: false, description: "Was the post-session follow-up email sent?" },
      { name: "rebookOfferSent", type: "boolean",  required: false, description: "Was a rebook offer sent?" },
      { name: "referralsReq",    type: "boolean",  required: false, description: "Were referrals requested?" },
      { name: "breakthroughNoted", type: "boolean", required: false, description: "Was a client breakthrough noted? Triggers testimonial request alert." },
      { name: "equipChecklist",  type: "object",   required: false, description: "Equipment checklist — 3 phases, 17 boolean items (audio_tech, room_supplies, admin_checkin)" },
      { name: "conversionResult",type: "string",   required: false, description: "Outcome summary (e.g. '2 3-packs sold')" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "offers", label: "Offers", lane: "B2C",
    description: "Sales offers made to clients or studios.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client or studio name" },
      { name: "type",            type: "select",   required: false, description: "Offer type", values: "Single session · 3-pack · 6-pack · 12-pack · Private session · Studio pilot · Studio recurring agreement · Corporate event · Group event · Referral partner offer" },
      { name: "amount",          type: "currency",  required: false, description: "Offer value ($)" },
      { name: "dateOffered",     type: "date",     required: false, description: "Date offer was sent" },
      { name: "expiresOn",       type: "date",     required: false, description: "Offer expiration date" },
      { name: "followUpDate",    type: "date",     required: false, description: "Scheduled follow-up date" },
      { name: "status",          type: "select",   required: false, description: "Offer lifecycle status", values: "Drafted · Sent · Viewed · Follow-Up Due · Accepted · Paid · Declined · Expired" },
      { name: "probability",     type: "number",   required: false, description: "Estimated close probability (0–100%)" },
      { name: "source",          type: "select",   required: false, description: "Lead source for this offer", values: "Referral · Instagram · Studio · Website · Direct · Event · Corporate · Other" },
      { name: "reasonLost",      type: "string",   required: false, description: "Reason if offer was declined or expired" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "revenue", label: "Revenue", lane: "B2C",
    description: "Individual revenue line items for attribution and profitability analysis.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "date",            type: "date",     required: true,  description: "Revenue date" },
      { name: "client",          type: "string",   required: false, description: "Linked client name" },
      { name: "session",         type: "string",   required: false, description: "Linked session ID or name" },
      { name: "channel",         type: "select",   required: false, description: "Revenue channel", values: "Studio session · Virtual session · Private client · Group package · Corporate event · Referral partner · Paid ad · Organic Instagram · Email list · Studio partner" },
      { name: "gross",           type: "currency",  required: false, description: "Gross revenue ($)" },
      { name: "stripeFee",       type: "currency",  required: false, description: "Payment processing fee ($)" },
      { name: "studioSplit",     type: "currency",  required: false, description: "Studio share ($)" },
      { name: "facilitatorCost", type: "currency",  required: false, description: "Facilitator / contractor cost ($)" },
      { name: "refunds",         type: "currency",  required: false, description: "Refund amount ($)" },
      { name: "net",             type: "currency",  required: false, description: "Net revenue after all deductions ($)" },
      { name: "costCenter",      type: "string",   required: false, description: "Cost center or accounting category" },
      { name: "source",          type: "string",   required: false, description: "Marketing source or campaign" },
      { name: "campaign",        type: "string",   required: false, description: "Campaign name" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "referrals", label: "Referrals", lane: "B2C",
    description: "Referral relationships — who referred whom and the resulting revenue.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "referrer",        type: "string",   required: true,  description: "Name of person who gave the referral" },
      { name: "referred",        type: "string",   required: false, description: "Name of person referred" },
      { name: "date",            type: "date",     required: false, description: "Date referral was received" },
      { name: "status",          type: "select",   required: false, description: "Referral status", values: "Received · Contacted · Attended · Purchased · Thanked · Closed" },
      { name: "attended",        type: "boolean",  required: false, description: "Did the referred person attend a session?" },
      { name: "purchased",       type: "boolean",  required: false, description: "Did they purchase an offer?" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue generated from this referral ($)" },
      { name: "thankYouSent",    type: "boolean",  required: false, description: "Was a thank-you sent to the referrer?" },
      { name: "rewardGiven",     type: "boolean",  required: false, description: "Was a referral reward given?" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "content", label: "Content Calendar", lane: "B2C",
    description: "Social media and email content — ideas, drafts, scheduled, and published.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "title",           type: "string",   required: true,  description: "Post title or working title" },
      { name: "body",            type: "textarea", required: false, description: "Caption or body copy" },
      { name: "platform",        type: "select",   required: false, description: "Publishing platform", values: "Instagram · Facebook · LinkedIn · TikTok · YouTube · Email · Blog · Other" },
      { name: "category",        type: "select",   required: false, description: "Content category", values: "Client transformation · Breathwork education · Nervous system regulation · Behind the scenes · Studio partner promotion · Founder story · Testimonials · FAQs · Contraindications/safety · Upcoming sessions" },
      { name: "status",          type: "select",   required: false, description: "Content lifecycle status", values: "Idea · Draft · Scheduled · Published · Archived" },
      { name: "scheduledDate",   type: "date",     required: false, description: "Scheduled publish date" },
      { name: "reach",           type: "number",   required: false, description: "Total accounts reached" },
      { name: "likes",           type: "number",   required: false, description: "Like count" },
      { name: "comments",        type: "number",   required: false, description: "Comment count" },
      { name: "shares",          type: "number",   required: false, description: "Share / repost count" },
      { name: "saves",           type: "number",   required: false, description: "Save count" },
      { name: "leads",           type: "number",   required: false, description: "Leads generated from this post" },
      { name: "booked",          type: "number",   required: false, description: "Bookings attributed to this post" },
      { name: "revenue",         type: "currency",  required: false, description: "Revenue attributed to this post ($)" },
      { name: "sessionPromoted", type: "string",   required: false, description: "Session name promoted in this post" },
      { name: "studioTagged",    type: "string",   required: false, description: "Studio partner tagged" },
      { name: "reused",          type: "boolean",  required: false, description: "Is this repurposed content?" },
      { name: "cta",             type: "string",   required: false, description: "Call to action text or link" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "outreach", label: "Outreach Hub", lane: "B2B",
    description: "Proactive studio and referral outreach tracking.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Target name (studio or individual)" },
      { name: "targetType",      type: "select",   required: false, description: "Type of outreach target", values: "Studio · Individual · Corporate · Event Space · Wellness Brand" },
      { name: "contactStatus",   type: "select",   required: false, description: "Contact lifecycle status", values: "Not contacted · Contacted · Responded · Meeting booked · Demo offered · Negotiating · Closed · Not interested" },
      { name: "messageUsed",     type: "textarea", required: false, description: "Outreach message or template used" },
      { name: "lastContact",     type: "date",     required: false, description: "Date of last contact" },
      { name: "nextFollowUp",    type: "date",     required: false, description: "Next scheduled follow-up date" },
      { name: "responseStatus",  type: "select",   required: false, description: "Response received", values: "No response · Positive · Neutral · Negative · Bounced" },
      { name: "warmth",          type: "select",   required: false, description: "Relationship warmth", values: "Cold · Warm · Hot" },
      { name: "source",          type: "select",   required: false, description: "How this target was found", values: "Instagram · Referral · LinkedIn · Walk-in · Event · Website · Directory · Other" },
      { name: "priority",        type: "number",   required: false, description: "Priority score (1–5)" },
      { name: "revenuePotential",type: "currency",  required: false, description: "Estimated revenue potential ($)" },
      { name: "partnerId",       type: "string",   required: false, description: "Linked Studio Partner record ID" },
      { name: "notes",           type: "textarea", required: false, description: "Free-form notes" },
    ],
  },
  {
    table: "testimonials", label: "Testimonials", lane: "B2C",
    description: "Client testimonials — written, video, and usage permissions.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "client",          type: "string",   required: true,  description: "Client name" },
      { name: "session",         type: "string",   required: false, description: "Session or journey attended" },
      { name: "written",         type: "textarea", required: false, description: "Full written testimonial text" },
      { name: "videoUrl",        type: "string",   required: false, description: "Video testimonial URL" },
      { name: "permissionRec",   type: "boolean",  required: false, description: "Was permission received to use this testimonial?" },
      { name: "useWebsite",      type: "boolean",  required: false, description: "Permitted for website use?" },
      { name: "useSocial",       type: "boolean",  required: false, description: "Permitted for social media use?" },
      { name: "firstNameOnly",   type: "boolean",  required: false, description: "First name only permission?" },
      { name: "theme",           type: "select",   required: false, description: "Testimonial theme", values: "Stress relief · Release · Clarity · Emotional breakthrough · Sleep · Performance · Transformation · Nervous system" },
      { name: "bestQuote",       type: "string",   required: false, description: "Single best pull-quote for marketing" },
      { name: "beforeSummary",   type: "textarea", required: false, description: "Client state before the session" },
      { name: "afterSummary",    type: "textarea", required: false, description: "Client state after the session" },
      { name: "status",          type: "select",   required: false, description: "Testimonial status", values: "Requested · Received · Approved · Published · Archived" },
      { name: "date",            type: "date",     required: false, description: "Date testimonial was received" },
    ],
  },
  {
    table: "templates", label: "Templates", lane: "Core",
    description: "Email and SMS communication templates.",
    fields: [
      { name: "id",              type: "string",   required: true,  description: "Auto-generated unique identifier" },
      { name: "name",            type: "string",   required: true,  description: "Template display name" },
      { name: "category",        type: "select",   required: false, description: "Template category", values: "B2B Outreach · Session · Follow-Up · Offer" },
      { name: "channel",         type: "select",   required: false, description: "Delivery channel", values: "Email · SMS" },
      { name: "subject",         type: "string",   required: false, description: "Email subject line (Email templates only)" },
      { name: "body",            type: "textarea", required: false, description: "Template body — supports {{variable}} placeholders" },
      { name: "linkedTo",        type: "select",   required: false, description: "Associated record type", values: "Client · Studio Partner · Session · Offer · General" },
      { name: "notes",           type: "textarea", required: false, description: "Usage notes or variable descriptions" },
    ],
  },
];

/* ── EMAIL LOGS ── */
const EMAIL_STATUS_COLOR = {
  sent:      "#2563EB",
  failed:    "#C0392B",
  delivered: "#4A8C6F",
  bounced:   "#C0392B",
  complained:"#D9892B",
  opened:    "#4A8C6F",
  clicked:   "#4A8C6F",
  queued:    "#D9892B",
  delivery_delayed: "#D9892B",
  unknown:   C.ink3,
};

function EmailLogsView({ data, setData }) {
  const logs = [...(data.emailLog || [])].reverse();
  const [checking, setChecking] = useState({});
  const [expanded, setExpanded] = useState(null);

  const checkStatus = async (entry) => {
    if (!entry.resendId || checking[entry.id]) return;
    setChecking(c => ({ ...c, [entry.id]: true }));
    try {
      const secret = import.meta.env.VITE_FRONTEND_SECRET || "";
      const res  = await fetch(`/api/email-status/${entry.resendId}`, { headers: { "x-frontend-secret": secret } });
      const json = await res.json();
      if (res.ok && json.status) {
        setData(d => ({
          ...d,
          emailLog: (d.emailLog || []).map(e =>
            e.id === entry.id ? { ...e, deliveryStatus: json.status, statusCheckedAt: new Date().toISOString() } : e
          ),
        }));
      }
    } catch (_) {}
    setChecking(c => ({ ...c, [entry.id]: false }));
  };

  // Auto-check unchecked sent emails when the tab loads
  useEffect(() => {
    const unchecked = (data.emailLog || []).filter(e => e.resendId && e.sendStatus === "sent" && !e.deliveryStatus);
    unchecked.forEach(entry => checkStatus(entry));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAll = async () => {
    const pending = logs.filter(e => e.resendId && e.sendStatus === "sent");
    for (const entry of pending) await checkStatus(entry);
  };

  const clearLog = () => {
    if (window.confirm("Clear the entire email log? This cannot be undone.")) {
      setData(d => ({ ...d, emailLog: [] }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>{logs.length} email{logs.length !== 1 ? "s" : ""} logged</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 2 }}>All emails sent from the CRM. Delivery status pulled from Resend.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {logs.some(e => e.resendId && e.sendStatus === "sent") && (
            <button onClick={checkAll} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surface, fontSize: 13, fontWeight: 600, color: C.brand, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <RefreshCw size={13} /> Refresh all statuses
            </button>
          )}
          {logs.length > 0 && (
            <button onClick={clearLog} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${hexA("#C0392B", 0.3)}`, background: hexA("#C0392B", 0.05), fontSize: 13, fontWeight: 600, color: "#C0392B", cursor: "pointer" }}>
              Clear log
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.ink3 }}>
          <Send size={32} color={C.line} style={{ display: "block", margin: "0 auto 12px" }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>No emails sent yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Emails sent via Templates will appear here</div>
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 110px 90px", gap: "0 12px", padding: "9px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.line}`, fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".06em" }}>
            <span>Date</span><span>Recipient</span><span>Template</span><span>Send</span><span>Delivery</span><span></span>
          </div>
          {logs.map((entry, i) => {
            const sendColor  = EMAIL_STATUS_COLOR[entry.sendStatus]     || C.ink3;
            const delivColor = EMAIL_STATUS_COLOR[entry.deliveryStatus] || C.ink3;
            const delivLabel = entry.deliveryStatus
              ? entry.deliveryStatus.replace(/_/g, " ")
              : entry.resendId ? "checking…" : "—";
            const isOpen     = expanded === entry.id;
            return (
              <div key={entry.id} style={{ borderBottom: i < logs.length - 1 ? `1px solid ${C.line}` : "none" }}>
                {/* Summary row — click to expand */}
                <div
                  onClick={() => setExpanded(isOpen ? null : entry.id)}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px 110px 44px", gap: "0 12px", padding: "10px 16px", alignItems: "center", fontSize: 13, cursor: "pointer", background: isOpen ? C.surfaceAlt : "transparent", transition: "background .15s" }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = hexA(C.brand, 0.03); }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Date */}
                  <div style={{ color: C.ink2, fontSize: 12 }}>
                    {new Date(entry.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    <div style={{ fontSize: 11, color: C.ink3 }}>{new Date(entry.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                  </div>
                  {/* Recipient */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.recipientName || entry.to}</div>
                    <div style={{ fontSize: 11.5, color: C.ink3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.to}</div>
                  </div>
                  {/* Template */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: C.ink }}>{entry.templateName}</div>
                    {entry.category && <div style={{ fontSize: 11.5, color: C.ink3 }}>{entry.category}</div>}
                  </div>
                  {/* Send status */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: hexA(sendColor, 0.1), color: sendColor }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: sendColor, display: "inline-block" }} />
                      {entry.sendStatus}
                      {entry.errorMsg && <span title={entry.errorMsg} style={{ cursor: "help" }}>⚠</span>}
                    </span>
                  </div>
                  {/* Delivery status */}
                  <div>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11.5, fontWeight: 700, background: hexA(delivColor, 0.1), color: delivColor }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: delivColor, display: "inline-block" }} />
                      {delivLabel}
                    </span>
                  </div>
                  {/* Expand chevron */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                    {entry.resendId && entry.sendStatus === "sent" && (
                      <button
                        onClick={e => { e.stopPropagation(); checkStatus(entry); }}
                        disabled={checking[entry.id]}
                        title="Re-check delivery status"
                        style={{ padding: "3px 6px", borderRadius: 6, border: `1px solid ${C.line}`, background: C.surface, color: C.ink3, cursor: checking[entry.id] ? "not-allowed" : "pointer", display: "flex", alignItems: "center" }}
                      >
                        <RefreshCw size={10} style={{ animation: checking[entry.id] ? "spin 1s linear infinite" : "none" }} />
                      </button>
                    )}
                    <ChevronDown size={14} color={C.ink3} style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform .2s", flexShrink: 0 }} />
                  </div>
                </div>

                {/* Expanded email preview */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
                    {/* Subject line */}
                    <div style={{ padding: "10px 14px", margin: "12px 0 0", background: hexA(C.brand, 0.05), border: `1px solid ${hexA(C.brand, 0.15)}`, borderRadius: "8px 8px 0 0", fontSize: 13, color: C.ink2 }}>
                      <span style={{ fontWeight: 700, color: C.ink3, marginRight: 8, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em" }}>Subject</span>
                      {entry.subject}
                    </div>
                    {/* Body */}
                    <div style={{ padding: "14px", background: C.surface, border: `1px solid ${hexA(C.brand, 0.15)}`, borderTop: "none", borderRadius: "0 0 8px 8px", fontSize: 13.5, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>
                      {entry.body || <span style={{ color: C.ink3, fontStyle: "italic" }}>Body not recorded (sent before logging was added)</span>}
                    </div>
                    {/* Meta footer */}
                    <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11.5, color: C.ink3 }}>
                      <span>To: <strong style={{ color: C.ink2 }}>{entry.to}</strong></span>
                      {entry.resendId && <span>Resend ID: <strong style={{ color: C.ink2, fontFamily: "monospace" }}>{entry.resendId}</strong></span>}
                      {entry.statusCheckedAt && <span>Status checked: <strong style={{ color: C.ink2 }}>{new Date(entry.statusCheckedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</strong></span>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── RESET TO PRODUCTION ── */
function ResetToProductionView({ data, setData, currentUser }) {
  const [confirm, setConfirm] = useState("");
  const [done, setDone]       = useState(false);
  const [step, setStep]       = useState(1); // 1 = info, 2 = confirm

  const TABLES_TO_WIPE   = ["clients","partners","sessions","registrations","offers","referrals","expenses","revenue","content","testimonials","sequences"];
  const TABLES_TO_KEEP   = ["templates","_settings"];

  const counts = TABLES_TO_WIPE.reduce((acc, t) => {
    acc[t] = (data[t] || []).length;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((s, n) => s + n, 0);

  const handleReset = () => {
    if (confirm !== "RESET") return;
    setData(prev => {
      const clean = { ...prev };
      TABLES_TO_WIPE.forEach(t => { clean[t] = []; });
      return clean;
    });
    setDone(true);
  };

  if (done) return (
    <div style={{ padding: "40px 24px", textAlign: "center" }}>
      <CheckCircle size={48} color="#4A8C6F" style={{ marginBottom: 16 }} />
      <div style={{ fontSize: 22, fontWeight: 800, color: "#2D6A50", marginBottom: 8 }}>Production reset complete</div>
      <div style={{ fontSize: 14, color: C.ink2, maxWidth: 460, margin: "0 auto", lineHeight: 1.6 }}>
        All test data has been wiped. Your templates, settings, journey descriptions, and user accounts are intact.
        The app is ready for real data.
      </div>
      <div style={{ marginTop: 20, padding: "12px 18px", background: hexA("#D9892B", 0.1), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, display: "inline-block", fontSize: 13, color: "#9A5D10", fontWeight: 600 }}>
        ⚠ Also clear the Calendly queue: run <code style={{ background: "#fff", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>DELETE /api/calendly/events</code> with your admin token, or restart the backend to start fresh.
      </div>
    </div>
  );

  return (
    <div style={{ padding: "0 4px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      {/* Header */}
      <div style={{ background: hexA("#C0392B", 0.06), border: `1px solid ${hexA("#C0392B", 0.2)}`, borderRadius: 12, padding: "16px 18px", display: "flex", gap: 14, alignItems: "flex-start" }}>
        <AlertCircle size={22} color="#C0392B" style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#C0392B", marginBottom: 4 }}>Reset to Production</div>
          <div style={{ fontSize: 13, color: C.ink2, lineHeight: 1.6 }}>
            This permanently deletes all test/seed data and leaves the app clean for real clients, sessions, and studio partners.
            <strong> This cannot be undone.</strong> Export a backup first if you need to preserve anything.
          </div>
        </div>
      </div>

      {step === 1 && (
        <>
          {/* What gets wiped */}
          <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: C.surfaceAlt, borderBottom: `1px solid ${C.line}`, fontWeight: 700, fontSize: 13, color: C.ink }}>
              What will be wiped ({total} total records)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
              {TABLES_TO_WIPE.map((t, i) => (
                <div key={t} style={{ padding: "9px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: i < TABLES_TO_WIPE.length - 2 ? `1px solid ${C.lineSoft || C.line}` : "none", borderRight: i % 2 === 0 ? `1px solid ${C.lineSoft || C.line}` : "none" }}>
                  <span style={{ fontSize: 13, color: C.ink, textTransform: "capitalize" }}>{t}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: counts[t] > 0 ? "#C0392B" : C.ink3 }}>{counts[t]} record{counts[t] !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>

          {/* What gets kept */}
          <div style={{ background: C.surface, border: `1px solid ${hexA("#4A8C6F", 0.3)}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", background: hexA("#4A8C6F", 0.06), borderBottom: `1px solid ${hexA("#4A8C6F", 0.2)}`, fontWeight: 700, fontSize: 13, color: "#2D6A50" }}>
              ✓ What will be preserved
            </div>
            <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", gap: 8 }}>
              {["14 message templates", "CRM settings & lists", "Journey descriptions", "User accounts & PINs", "Admin configuration"].map(item => (
                <span key={item} style={{ fontSize: 12.5, fontWeight: 600, padding: "4px 12px", borderRadius: 20, background: hexA("#4A8C6F", 0.1), color: "#2D6A50" }}>{item}</span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setStep(2)} style={{
              padding: "10px 24px", borderRadius: 9, border: "none", cursor: "pointer",
              background: "#C0392B", color: "#fff", fontWeight: 700, fontSize: 13.5,
            }}>
              I understand — continue to reset
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "20px 20px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 6 }}>Type RESET to confirm</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginBottom: 14, lineHeight: 1.55 }}>
            This will permanently delete <strong>{total} records</strong> across {TABLES_TO_WIPE.length} tables.
            Your templates, settings, and user accounts will not be affected.
          </div>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Type RESET here"
            autoFocus
            style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${confirm === "RESET" ? "#4A8C6F" : C.line}`, fontSize: 14, fontWeight: 700, letterSpacing: "0.1em", color: C.ink, boxSizing: "border-box", outline: "none", marginBottom: 14 }}
          />
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => { setStep(1); setConfirm(""); }} style={{
              padding: "10px 20px", borderRadius: 9, border: `1px solid ${C.line}`,
              background: "transparent", color: C.ink2, fontWeight: 600, fontSize: 13, cursor: "pointer",
            }}>Back</button>
            <button onClick={handleReset} disabled={confirm !== "RESET"} style={{
              padding: "10px 24px", borderRadius: 9, border: "none", fontWeight: 700, fontSize: 13.5,
              cursor: confirm === "RESET" ? "pointer" : "not-allowed",
              background: confirm === "RESET" ? "#C0392B" : C.line,
              color: confirm === "RESET" ? "#fff" : C.ink3,
              transition: "background .15s",
            }}>
              Wipe {total} records — go live
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminView({ tab, data, setData, secUsers, currentUser, today, crmSettings, onSaveSettings }) {
  const [integrityResults, setIntegrityResults] = useState(null);
  const [runningCheck, setRunningCheck]         = useState(false);
  const [schemaTable,  setSchemaTable]          = useState(DB_SCHEMA[0].table);
  const [exportMsg,    setExportMsg]            = useState("");
  const [expandedField, setExpandedField]       = useState(null);

  // ── record counts + sizes ──
  const tables = DB_SCHEMA.map(t => {
    const rows   = data[t.table] || [];
    const bytes  = new TextEncoder().encode(JSON.stringify(rows)).length;
    return { ...t, count: rows.length, sizeKB: (bytes / 1024).toFixed(1) };
  });
  const totalRecords = tables.reduce((s, t) => s + t.count, 0);
  const totalKB      = tables.reduce((s, t) => s + parseFloat(t.sizeKB), 0).toFixed(1);
  const storageUsedKB = (() => {
    try {
      const raw = localStorage.getItem("simplybreathe:data:v5:enc") || "";
      return (raw.length / 1024).toFixed(1);
    } catch { return "N/A"; }
  })();

  // ── integrity checks ──
  const runIntegrity = () => {
    setRunningCheck(true);
    const issues = [];
    const warn = (table, id, field, msg, severity = "medium") =>
      issues.push({ table, id, field, msg, severity });

    // Clients
    (data.clients || []).forEach(r => {
      if (!r.name?.trim())       warn("clients",      r.id, "name",    "Missing name",                  "high");
      if (!r.email && !r.phone)  warn("clients",      r.id, "contact", "No email or phone",             "medium");
    });
    // Partners
    (data.partners || []).forEach(r => {
      if (!r.name?.trim())       warn("partners",     r.id, "name",    "Missing studio name",           "high");
      if (!r.stage)              warn("partners",     r.id, "stage",   "No pipeline stage set",         "medium");
    });
    // Sessions
    (data.sessions || []).forEach(r => {
      if (!r.date)               warn("sessions",     r.id, "date",    "Missing session date",          "high");
      if (r.grossRevenue > 0 && !r.netRevenue)
                                 warn("sessions",     r.id, "netRevenue","Gross revenue set but net missing","medium");
      if (r.status === "Completed" && !r.followUpSent)
                                 warn("sessions",     r.id, "followUpSent","Completed session — follow-up not sent","low");
    });
    // Offers
    (data.offers || []).forEach(r => {
      if (!r.client?.trim())     warn("offers",       r.id, "client",  "Offer has no linked client",    "high");
      if (!r.amount || r.amount <= 0)
                                 warn("offers",       r.id, "amount",  "Offer amount is zero or missing","medium");
      if (r.expiresOn && r.expiresOn < today && !["Accepted","Paid","Declined","Expired"].includes(r.status))
                                 warn("offers",       r.id, "expiresOn","Offer past expiry but still open","medium");
    });
    // Revenue
    (data.revenue || []).forEach(r => {
      if (!r.date)               warn("revenue",      r.id, "date",    "Missing revenue date",          "high");
      if (!r.gross && !r.net)    warn("revenue",      r.id, "gross",   "No gross or net revenue value", "medium");
    });
    // Referrals
    (data.referrals || []).forEach(r => {
      if (!r.referrer?.trim())   warn("referrals",    r.id, "referrer","Missing referrer name",         "high");
    });
    // Testimonials
    (data.testimonials || []).forEach(r => {
      if (!r.client?.trim())     warn("testimonials", r.id, "client",  "Missing client name",           "high");
      if (r.status === "Approved" && !r.permissionRec)
                                 warn("testimonials", r.id, "permissionRec","Approved but no permission recorded","high");
    });
    // Templates
    (data.templates || []).forEach(r => {
      if (!r.name?.trim())       warn("templates",    r.id, "name",    "Template has no name",          "high");
      if (!r.body?.trim())       warn("templates",    r.id, "body",    "Template body is empty",        "medium");
    });

    setTimeout(() => { setIntegrityResults(issues); setRunningCheck(false); }, 300);
  };

  // ── export all data (Owner only) ──
  const exportAll = () => {
    if (currentUser?.role !== "Owner") return;
    const ok = window.confirm(
      "⚠️ Security reminder\n\n" +
      "This backup file contains ALL your CRM data in plain text — client names, emails, phone numbers, and financial records.\n\n" +
      "• Store it in a secure location (encrypted drive or password manager).\n" +
      "• Do not share it or leave it in Downloads.\n\n" +
      "Download anyway?"
    );
    if (!ok) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a"); a.href = url;
    a.download = `sbcrm-backup-${today}.json`; a.click();
    URL.revokeObjectURL(url);
    setExportMsg("✓ Backup downloaded — store it securely");
    setTimeout(() => setExportMsg(""), 5000);
  };

  const SEV_COLOR = { high: "#EF4444", medium: "#F59E0B", low: C.ink3 };
  const SEV_BG    = { high: "#FEF2F2", medium: "#FFFBEB", low: C.surfaceAlt };
  const TYPE_COLOR = { string: "#2E6FB0", number: "#D9892B", currency: "#4A8C6F", date: "#8E44AD", boolean: "#2A9D8F", select: C.brand, array: "#C0392B", object: "#6B5CE7", email: "#2E6FB0", textarea: "#55627B" };

  const schDef = DB_SCHEMA.find(t => t.table === schemaTable);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>

      {tab === "overview" && (
        <>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
            {[
              { label: "Total Records",    value: totalRecords,                      sub: "across all tables" },
              { label: "Active Users",     value: secUsers.length,                   sub: "logged-in accounts" },
              { label: "Data Size",        value: totalKB + " KB",                   sub: "uncompressed JSON" },
              { label: "Storage Used",     value: storageUsedKB + " KB",             sub: "encrypted in localStorage" },
            ].map(s => (
              <div key={s.label} style={{ background: C.surface, borderRadius: 14, padding: "18px 20px", border: `1px solid ${C.line}` }}>
                <div style={{ fontSize: 11, color: C.ink3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: C.ink, margin: "6px 0 2px", fontFamily: FONT.display }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>{s.sub}</div>
              </div>
            ))}
          </div>

          {/* Table record counts */}
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>Database Tables</div>
              <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Record counts and estimated size per table</div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  {["Table","Lane","Records","Fields","Size","Status"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.line}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tables.map((t, i) => (
                  <tr key={t.table} style={{ borderBottom: i < tables.length - 1 ? `1px solid ${C.line}` : "none" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{t.label}</div>
                      <div style={{ fontSize: 11, color: C.ink3 }}>{t.table}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8,
                        background: t.lane === "B2C" ? C.brandSoft : t.lane === "B2B" ? "#E0F5F0" : C.surfaceAlt,
                        color: t.lane === "B2C" ? C.brandDeep : t.lane === "B2B" ? "#2A9D8F" : C.ink3 }}>
                        {t.lane}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: t.count === 0 ? "#EF4444" : C.ink }}>{t.count}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.ink2 }}>{t.fields.length}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: C.ink3 }}>{t.sizeKB} KB</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.count > 0 ? "#16A34A" : "#EF4444" }}>
                        {t.count > 0 ? "✓ Has data" : "Empty"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* System info */}
          <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: C.surface, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 12 }}>Storage Keys</div>
              {[
                { key: "simplybreathe:data:v5:enc", desc: "Encrypted CRM data" },
                { key: "sb:security:v1",            desc: "User accounts & PIN hashes" },
              ].map(k => (
                <div key={k.key} style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: C.brand, background: C.brandMist, padding: "4px 8px", borderRadius: 6, wordBreak: "break-all" }}>{k.key}</div>
                  <div style={{ fontSize: 11, color: C.ink3, marginTop: 3 }}>{k.desc}</div>
                </div>
              ))}
            </div>
            <div style={{ background: C.surface, borderRadius: 14, padding: "16px 20px", border: `1px solid ${C.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 12 }}>Encryption</div>
              {[
                { label: "Algorithm",      value: "AES-256-GCM" },
                { label: "Key derivation", value: `PBKDF2 · SHA-256 · ${((currentUser?.pbkdf2Iterations ?? 100_000) / 1000).toFixed(0)}k iterations` },
                { label: "Salt length",    value: "16 bytes (random per user)" },
                { label: "Key model",      value: "Envelope encryption (master key wrapped per user)" },
                { label: "Data version",   value: "v5" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}>
                  <span style={{ color: C.ink3 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === "schema" && (
        <>
          {/* Table selector */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {DB_SCHEMA.map(t => (
              <button key={t.table} onClick={() => { setSchemaTable(t.table); setExpandedField(null); }}
                style={{ padding: "7px 14px", borderRadius: 9, border: `1px solid ${schemaTable === t.table ? C.brand : C.line}`,
                  background: schemaTable === t.table ? C.brandSoft : C.surface,
                  color: schemaTable === t.table ? C.brandDeep : C.ink2,
                  fontWeight: schemaTable === t.table ? 700 : 500, fontSize: 13, cursor: "pointer" }}>
                {t.label}
                <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.7 }}>({t.fields.length})</span>
              </button>
            ))}
          </div>

          {schDef && (
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, overflow: "hidden" }}>
              {/* Table header */}
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.line}`, background: C.surfaceAlt }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, background: C.brandSoft, color: C.brandDeep, padding: "4px 12px", borderRadius: 8 }}>{schDef.table}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 8,
                    background: schDef.lane === "B2C" ? C.brandSoft : schDef.lane === "B2B" ? "#E0F5F0" : C.surfaceAlt,
                    color: schDef.lane === "B2C" ? C.brandDeep : schDef.lane === "B2B" ? "#2A9D8F" : C.ink3 }}>
                    {schDef.lane}
                  </span>
                  <span style={{ fontSize: 13, color: C.ink2 }}>{schDef.description}</span>
                </div>
              </div>

              {/* Field rows */}
              {schDef.fields.map((f, i) => (
                <div key={f.name}
                  style={{ borderBottom: i < schDef.fields.length - 1 ? `1px solid ${C.line}` : "none",
                    background: expandedField === f.name ? C.surfaceAlt : "transparent", cursor: "pointer" }}
                  onClick={() => setExpandedField(expandedField === f.name ? null : f.name)}>
                  <div style={{ display: "grid", gridTemplateColumns: "200px 110px 80px 1fr", alignItems: "center", padding: "12px 22px", gap: 12 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600, color: C.ink }}>{f.name}</div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 8, background: hexA(TYPE_COLOR[f.type] || C.ink3, 0.12), color: TYPE_COLOR[f.type] || C.ink3, display: "inline-block" }}>{f.type}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: f.required ? "#EF4444" : C.ink3 }}>{f.required ? "Required" : "Optional"}</span>
                    <span style={{ fontSize: 13, color: C.ink2 }}>{f.description}</span>
                  </div>
                  {expandedField === f.name && f.values && (
                    <div style={{ padding: "0 22px 14px 22px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Allowed Values</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {f.values.split(" · ").map(v => (
                          <span key={v} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 8, background: C.brandSoft, color: C.brandDeep, fontWeight: 500 }}>{v}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div style={{ padding: "10px 22px", borderTop: `1px solid ${C.line}`, fontSize: 12, color: C.ink3, display: "flex", gap: 16 }}>
                <span><strong>{schDef.fields.length}</strong> fields total</span>
                <span><strong>{schDef.fields.filter(f => f.required).length}</strong> required</span>
                <span><strong>{schDef.fields.filter(f => f.type === "select").length}</strong> dropdowns</span>
                <span><strong>{schDef.fields.filter(f => f.type === "boolean").length}</strong> checkboxes</span>
                <span style={{ marginLeft: "auto", fontStyle: "italic" }}>Click a row to see allowed values</span>
              </div>
            </div>
          )}
        </>
      )}

      {tab === "integrity" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Data Integrity Check</div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>Scans all records for missing required fields, logical inconsistencies, and data quality issues.</div>
            </div>
            <button onClick={runIntegrity} disabled={runningCheck}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 22px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 600, cursor: runningCheck ? "not-allowed" : "pointer", opacity: runningCheck ? 0.7 : 1 }}>
              {runningCheck ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Running…</> : <><Activity size={14} /> Run Check</>}
            </button>
          </div>

          {integrityResults === null ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: C.ink3 }}>
              <Activity size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Click "Run Check" to scan all records</div>
            </div>
          ) : integrityResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#16A34A" }}>
              <Check size={40} style={{ marginBottom: 12 }} />
              <div style={{ fontSize: 16, fontWeight: 700 }}>All Clear</div>
              <div style={{ fontSize: 13, color: C.ink3, marginTop: 6 }}>No integrity issues found across {totalRecords} records.</div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
                {["high","medium","low"].map(sev => {
                  const cnt = integrityResults.filter(i => i.severity === sev).length;
                  return (
                    <div key={sev} style={{ flex: 1, background: SEV_BG[sev], border: `1px solid ${SEV_COLOR[sev]}30`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
                      <div style={{ fontSize: 26, fontWeight: 800, color: SEV_COLOR[sev] }}>{cnt}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: SEV_COLOR[sev], textTransform: "capitalize" }}>{sev} severity</div>
                    </div>
                  );
                })}
              </div>

              {/* Issue list */}
              <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`, overflow: "hidden" }}>
                {["high","medium","low"].flatMap(sev =>
                  integrityResults.filter(i => i.severity === sev).map((issue, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "90px 140px 130px 1fr", gap: 12, alignItems: "center", padding: "12px 18px", borderBottom: `1px solid ${C.line}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 7, background: SEV_BG[issue.severity], color: SEV_COLOR[issue.severity], textTransform: "capitalize", textAlign: "center" }}>{issue.severity}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: C.ink2 }}>{issue.table}</span>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: C.brand }}>{issue.field}</span>
                      <span style={{ fontSize: 13, color: C.ink }}>{issue.msg}</span>
                    </div>
                  ))
                )}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: C.ink3, textAlign: "right" }}>{integrityResults.length} issue{integrityResults.length !== 1 ? "s" : ""} found across {totalRecords} records</div>
            </>
          )}
        </>
      )}

      {tab === "storage" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {/* Export */}
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 6 }}>Export Backup</div>
              <div style={{ fontSize: 13, color: C.ink3, marginBottom: 12, lineHeight: 1.6 }}>
                Downloads a full JSON backup of all CRM data.
              </div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 12px", marginBottom: 18 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>⚠️</span>
                <div style={{ fontSize: 12, color: "#92400E", lineHeight: 1.5 }}>
                  <strong>Plain-text file.</strong> The downloaded file is <em>not encrypted</em>. It contains client names, emails, phone numbers, and financial records. Store it securely and do not leave it in your Downloads folder.
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.ink2, marginBottom: 16 }}>
                <strong>{totalRecords}</strong> records · <strong>{totalKB} KB</strong> uncompressed
              </div>
              {currentUser?.role === "Owner" ? (
                <button onClick={exportAll}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <Download size={14} /> Download Backup
                </button>
              ) : (
                <div style={{ fontSize: 12, color: C.ink3, padding: "8px 0" }}>Only the Owner account can export data.</div>
              )}
              {exportMsg && <div style={{ marginTop: 10, fontSize: 13, color: "#16A34A", fontWeight: 600 }}>{exportMsg}</div>}
            </div>

            {/* Storage details */}
            <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.line}`, padding: "22px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.ink, marginBottom: 14 }}>Storage Details</div>
              {[
                { label: "Encrypted store size",  value: storageUsedKB + " KB" },
                { label: "Uncompressed data size", value: totalKB + " KB" },
                { label: "Total records",          value: totalRecords },
                { label: "Active users",           value: secUsers.length },
                { label: "Logged in as",           value: currentUser?.name || "—" },
                { label: "Current role",           value: currentUser?.role || "—" },
              ].map(r => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.line}`, fontSize: 13 }}>
                  <span style={{ color: C.ink3 }}>{r.label}</span>
                  <span style={{ fontWeight: 600, color: C.ink }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-table breakdown */}
          <div style={{ marginTop: 18, background: C.surface, borderRadius: 14, border: `1px solid ${C.line}`, padding: "18px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.ink, marginBottom: 14 }}>Storage by Table</div>
            {tables.map(t => {
              const pct = totalKB > 0 ? (parseFloat(t.sizeKB) / parseFloat(totalKB)) * 100 : 0;
              return (
                <div key={t.table} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: C.ink, fontWeight: 600 }}>{t.label} <span style={{ color: C.ink3, fontWeight: 400 }}>({t.count} records)</span></span>
                    <span style={{ color: C.ink3 }}>{t.sizeKB} KB · {pct.toFixed(1)}%</span>
                  </div>
                  <div style={{ height: 6, background: C.line, borderRadius: 4 }}>
                    <div style={{ height: "100%", width: pct + "%", background: C.brand, borderRadius: 4, minWidth: pct > 0 ? 4 : 0 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "settings" && crmSettings && (
        <CrmSettingsView settings={crmSettings} onSave={onSaveSettings} />
      )}

      {tab === "journeys" && crmSettings && (
        <JourneyDescriptionsView settings={crmSettings} onSave={onSaveSettings} />
      )}
      {tab === "email-logs" && (
        <EmailLogsView data={data} setData={setData} />
      )}
      {tab === "reset" && (
        <ResetToProductionView data={data} setData={setData} currentUser={currentUser} />
      )}
    </div>
  );
}

/* ============================================================
   CRM SETTINGS VIEW
   ============================================================ */
const SETTINGS_META = [
  { key: "sources",        label: "Lead Sources",        hint: "Where clients and studio leads come from. Shown in client & offer forms." },
  { key: "clientTypes",    label: "Client Types",         hint: "Client segment labels used in the client form and analytics." },
  { key: "clientStatuses", label: "Client Statuses",      hint: "Status options for a client record (e.g. Lead, Booked, Member)." },
  { key: "packageTypes",   label: "Package Types",        hint: "Package options available to clients (e.g. Drop-in, 3-pack, Membership)." },
  { key: "offerTypes",     label: "Offer Types",          hint: "Types of offers/products you can create in the Offers & Sales section." },
  { key: "referralLevels", label: "Referral Potential",   hint: "Referral strength levels used on client records (e.g. Low, Medium, High)." },
];

function CrmSettingsView({ settings, onSave }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(settings)));
  const [saved, setSaved] = useState(false);
  const [newVal, setNewVal] = useState({});

  const addItem = (key) => {
    const v = (newVal[key] || "").trim();
    if (!v || draft[key].includes(v)) return;
    setDraft(d => ({ ...d, [key]: [...d[key], v] }));
    setNewVal(n => ({ ...n, [key]: "" }));
  };

  const removeItem = (key, item) => {
    setDraft(d => ({ ...d, [key]: d[key].filter(x => x !== item) }));
  };

  const moveItem = (key, idx, dir) => {
    setDraft(d => {
      const arr = [...d[key]];
      const swap = idx + dir;
      if (swap < 0 || swap >= arr.length) return d;
      [arr[idx], arr[swap]] = [arr[swap], arr[idx]];
      return { ...d, [key]: arr };
    });
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = (key) => {
    setDraft(d => ({ ...d, [key]: [...DEFAULT_CRM_SETTINGS[key]] }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>CRM Settings</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 3 }}>Customise dropdown options throughout the CRM. Changes apply immediately after saving.</div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: saved ? "#4A8C6F" : C.brand, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "background 0.2s" }}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {SETTINGS_META.map(({ key, label, hint }) => (
          <div key={key} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink }}>{label}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 2 }}>{hint}</div>
              </div>
              <button onClick={() => handleReset(key)} title="Reset to defaults"
                style={{ fontSize: 10.5, color: C.ink3, background: "transparent", border: `1px solid ${C.line}`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>
                Reset
              </button>
            </div>

            {/* Item list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
              {draft[key].map((item, idx) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 6, background: C.surfaceAlt || "#F8F9FB", borderRadius: 7, padding: "5px 8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <button onClick={() => moveItem(key, idx, -1)} disabled={idx === 0}
                      style={{ background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? C.line : C.ink3, padding: 0, lineHeight: 1, fontSize: 9 }}>▲</button>
                    <button onClick={() => moveItem(key, idx, 1)} disabled={idx === draft[key].length - 1}
                      style={{ background: "none", border: "none", cursor: idx === draft[key].length - 1 ? "default" : "pointer", color: idx === draft[key].length - 1 ? C.line : C.ink3, padding: 0, lineHeight: 1, fontSize: 9 }}>▼</button>
                  </div>
                  <span style={{ flex: 1, fontSize: 12.5, color: C.ink, fontWeight: 500 }}>{item}</span>
                  <button onClick={() => removeItem(key, item)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#C0573F", fontSize: 14, lineHeight: 1, padding: "0 2px", opacity: 0.7 }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
                    title="Remove">×</button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newVal[key] || ""}
                onChange={e => setNewVal(n => ({ ...n, [key]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && addItem(key)}
                placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
                style={{ flex: 1, padding: "6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink }}
              />
              <button onClick={() => addItem(key)}
                style={{ padding: "6px 12px", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`, borderRadius: 7, cursor: "pointer", color: C.brand, fontWeight: 700, fontSize: 13 }}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   JOURNEY DESCRIPTIONS VIEW
   ============================================================ */
function JourneyDescriptionsView({ settings, onSave }) {
  const [items, setItems] = useState(() => JSON.parse(JSON.stringify(settings.journeyDescriptions || [])));
  const [saved, setSaved] = useState(false);
  const [newName, setNewName] = useState("");

  const set = (id, field, val) =>
    setItems(prev => prev.map(j => j.id === id ? { ...j, [field]: val } : j));

  const addJourney = () => {
    const name = newName.trim();
    if (!name) return;
    setItems(prev => [...prev, { id: `jd_${Date.now()}`, name, description: "" }]);
    setNewName("");
  };

  const removeJourney = (id) => setItems(prev => prev.filter(j => j.id !== id));

  const handleSave = () => {
    // Save journeyDescriptions AND keep journeys string array in sync
    const next = {
      ...settings,
      journeyDescriptions: items,
      journeys: items.map(j => j.name).filter(Boolean),
    };
    onSave(next);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Journey Descriptions</div>
          <div style={{ fontSize: 12.5, color: C.ink3, marginTop: 3 }}>
            Define the name and full description for each breathwork journey. Names appear in session records and calendar pills.
          </div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 20px", background: saved ? "#4A8C6F" : C.brand, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "background 0.2s", flexShrink: 0 }}>
          {saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      {/* Add new journey */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addJourney()}
          placeholder="New journey name…"
          style={{ flex: 1, padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, maxWidth: 320 }}
        />
        <button onClick={addJourney} style={{ padding: "8px 16px", background: hexA(C.brand, 0.1), border: `1px solid ${hexA(C.brand, 0.3)}`, borderRadius: 8, cursor: "pointer", color: C.brand, fontWeight: 700, fontSize: 13 }}>
          + Add Journey
        </button>
      </div>

      {/* Journey list */}
      {items.length === 0 && (
        <div style={{ textAlign: "center", color: C.ink3, fontSize: 13, padding: "40px 0" }}>No journeys yet. Add one above.</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((j, idx) => (
          <div key={j.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14, padding: "18px 20px" }}>
            {/* Journey name row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: C.brand, flexShrink: 0 }}>
                {idx + 1}
              </div>
              <input
                value={j.name}
                onChange={e => set(j.id, "name", e.target.value)}
                placeholder="Journey name"
                style={{ flex: 1, padding: "7px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 14, fontWeight: 600, color: C.ink, background: C.surface }}
              />
              <button onClick={() => removeJourney(j.id)}
                title="Remove journey"
                style={{ background: "none", border: `1px solid ${hexA("#C0573F", 0.3)}`, borderRadius: 7, cursor: "pointer", color: "#C0573F", fontSize: 12, fontWeight: 600, padding: "5px 10px", flexShrink: 0 }}>
                Remove
              </button>
            </div>

            {/* Description */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Description</div>
              <textarea
                value={j.description}
                onChange={e => set(j.id, "description", e.target.value)}
                placeholder="Enter a full description of this journey — what it involves, the experience, outcomes, and anything clients should know…"
                rows={5}
                style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, background: C.surfaceAlt || "#F8F9FB", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit", boxSizing: "border-box", minHeight: 100 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AVATAR_COLORS = ["#2E6FB0","#6B5CE7","#D9892B","#4A8C6F","#2A9D8F","#C0392B","#8E44AD","#16A085","#E67E22","#2980B9"];

function EditProfileModal({ user, masterKeyRaw, onSave, onClose }) {
  const [name,        setName]        = useState(user?.name  || "");
  const [title,       setTitle]       = useState(user?.title || "");
  const [email,       setEmail]       = useState(user?.email || "");
  const [phone,       setPhone]       = useState(user?.phone || "");
  const [color,       setColor]       = useState(user?.color || AVATAR_COLORS[0]);
  const [avatar,      setAvatar]      = useState(user?.avatar || "");
  const [tab,         setTab]         = useState("profile"); // profile | security
  const [curPin,      setCurPin]      = useState("");
  const [newPin,      setNewPin]      = useState("");
  const [confirmPin,  setConfirmPin]  = useState("");
  const [pinMsg,      setPinMsg]      = useState("");
  const [saving,      setSaving]      = useState(false);
  const [msg,         setMsg]         = useState("");
  const fileRef = useRef();

  const initials = (name || user?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setMsg("Image must be under 5 MB."); return; }
    setMsg("");
    const reader = new FileReader();
    reader.onerror = () => setMsg("Could not read the file. Please try another image.");
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => setMsg("File does not appear to be a valid image. Please try a JPEG or PNG.");
      img.onload = () => {
        const MAX = 240;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        setAvatar(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) { setMsg("Name is required."); return; }
    setSaving(true); setMsg("");
    try {
      const updates = { name: name.trim(), title, email, phone, color, avatar };

      if (tab === "security" && (curPin || newPin || confirmPin)) {
        if (!curPin)              { setPinMsg("Enter your current PIN."); setSaving(false); return; }
        if (newPin.length < 6)    { setPinMsg("New PIN must be at least 6 characters."); setSaving(false); return; }
        if (newPin !== confirmPin){ setPinMsg("New PINs don't match."); setSaving(false); return; }
        // Verify current PIN using the stored iteration count (may be legacy 100k)
        const storedIter = user.pbkdf2Iterations ?? 100_000;
        try { await Sec.unwrapKeyForUser(user.wrappedMasterKey, curPin, user.pinSalt, storedIter); }
        catch (_) { setPinMsg("Current PIN is incorrect."); setSaving(false); return; }
        const pinSalt = Sec.newSalt();
        const wrappedMasterKey = masterKeyRaw
          ? await Sec.wrapKeyForUser(masterKeyRaw, newPin, pinSalt, Sec.PBKDF2_ITERATIONS)
          : user.wrappedMasterKey;
        Object.assign(updates, { pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS });
        setPinMsg(""); setCurPin(""); setNewPin(""); setConfirmPin("");
      }
      await onSave(updates);
      onClose();
    } catch (e) { setMsg("Error saving: " + (e?.message || e)); }
    setSaving(false);
  };

  const TABS = [{ id: "profile", label: "Profile" }, { id: "security", label: "Security" }];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(16,33,58,0.55)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>
      <div style={{ background: C.surface, borderRadius: 20, width: "100%", maxWidth: 520, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)", display: "flex", flexDirection: "column" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 28px 16px" }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.ink, fontFamily: FONT.display }}>Edit Profile</div>
            <div style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>{user?.role || "User"} · {user?.createdAt ? `Member since ${user.createdAt}` : "Simply Breathe OS"}</div>
          </div>
          <button onClick={onClose} style={{ background: C.surfaceAlt, border: "none", borderRadius: 10, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.ink2 }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 28px 16px", borderBottom: `1px solid ${C.line}` }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "7px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t.id ? C.brandSoft : "transparent", color: tab === t.id ? C.brandDeep : C.ink3 }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: "24px 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

          {tab === "profile" && (
            <>
              {/* Avatar section */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
                {/* Avatar preview */}
                <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 96, height: 96, borderRadius: "50%", background: color, overflow: "hidden", cursor: "pointer", border: `3px solid ${C.line}` }}
                    onClick={() => fileRef.current?.click()}>
                    {avatar
                      ? <img src={avatar} alt="avatar" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#fff" }}>{initials}</span>
                    }
                    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity .15s", borderRadius: "50%" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <Upload size={20} color="#fff" />
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
                    <button onClick={() => fileRef.current?.click()}
                      style={{ fontSize: 11, padding: "5px 14px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.surfaceAlt, cursor: "pointer", color: C.ink2, fontWeight: 600 }}>
                      Upload photo
                    </button>
                    {avatar && (
                      <button onClick={() => setAvatar("")}
                        style={{ fontSize: 11, color: C.ink3, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Color swatches (visible only when no photo) */}
                {!avatar && (
                  <div style={{ paddingTop: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.ink2, marginBottom: 10 }}>Avatar color</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 28px)", gap: 7 }}>
                      {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => setColor(c)}
                          style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? `3px solid ${C.ink}` : "2px solid transparent", cursor: "pointer", transition: "transform .1s" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Full Name *</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Title / Role</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lead Facilitator"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Role</label>
                  <div style={{ padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink3, background: C.surfaceAlt }}>{user?.role || "—"}</div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>Phone</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
            </>
          )}

          {tab === "security" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ background: C.surfaceAlt, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={18} color={C.brand} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Change PIN</div>
                  <div style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>Your PIN encrypts and protects your data. Use at least 6 characters.</div>
                </div>
              </div>
              {[
                { label: "Current PIN", val: curPin, set: setCurPin },
                { label: "New PIN",     val: newPin, set: setNewPin },
                { label: "Confirm New PIN", val: confirmPin, set: setConfirmPin },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: C.ink2, display: "block", marginBottom: 6 }}>{label}</label>
                  <input type="password" value={val} onChange={e => set(e.target.value)} placeholder="••••••"
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid ${pinMsg ? "#EF4444" : C.line}`, borderRadius: 10, fontSize: 14, color: C.ink, background: C.bg, outline: "none", boxSizing: "border-box", letterSpacing: "0.2em" }} />
                </div>
              ))}
              {pinMsg && <div style={{ fontSize: 12, color: "#EF4444", padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>{pinMsg}</div>}
            </div>
          )}

          {msg && <div style={{ fontSize: 13, color: "#EF4444", padding: "10px 14px", background: "#FEF2F2", borderRadius: 10 }}>{msg}</div>}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 28px 24px", borderTop: `1px solid ${C.line}` }}>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 10, border: `1px solid ${C.line}`, background: "transparent", fontSize: 14, cursor: "pointer", color: C.ink2, fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: "10px 26px", borderRadius: 10, border: "none", background: C.brand, color: "#fff", fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
            {saving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : <><Check size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ message, okLabel = "OK", danger = false, onOk, onCancel }) {
  return (
    <div className="sb-drawerwrap" onMouseDown={onCancel} style={{ zIndex: 80 }}>
      <div onMouseDown={e => e.stopPropagation()} style={{
        background: C.surface, borderRadius: 18, padding: "32px 32px 24px",
        width: 380, maxWidth: "92vw", textAlign: "center",
        boxShadow: `0 24px 80px ${hexA(C.brandDeep, 0.28)}, 0 4px 16px ${hexA(C.brandDeep, 0.1)}`,
        animation: "sb-pop .2s cubic-bezier(.22,.68,0,1.2)",
      }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.brandSoft,
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          {danger
            ? <LogOut size={22} color={C.brand} strokeWidth={1.5} />
            : <Info size={22} color={C.brand} strokeWidth={1.5} />}
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: C.ink, marginBottom: 8 }}>
          {okLabel}?
        </div>
        <div style={{ fontSize: 14, color: C.ink3, lineHeight: 1.6, marginBottom: 28, fontWeight: 700 }}>{message}</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button onClick={onCancel} className="sb-ghost" style={{ minWidth: 100, justifyContent: "center" }}>
            Cancel
          </button>
          <button onClick={onOk} style={{
            minWidth: 120, padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 14, justifyContent: "center",
            background: C.brand, color: "#fff",
            boxShadow: `0 2px 8px ${hexA(C.brand, 0.35)}`,
          }}>
            {okLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportModal({ data, setData, onClose }) {
  const [staged, setStaged] = useState({});  // db -> parsed rows
  const [busy, setBusy] = useState(false);

  const handleFile = (db, file) => {
    if (file.size > 10 * 1024 * 1024) { alert("CSV file must be under 10 MB."); return; }
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const spec = IMPORT_MAP[db];
        const rows = res.data.map((raw) => {
          const rec = { id: uid(db) };
          const lower = {};
          Object.keys(raw).forEach((k) => { lower[norm(k)] = raw[k]; });
          Object.entries(spec.map).forEach(([csvKey, field]) => {
            let val = lower[csvKey] ?? "";
            val = Sec.sanitize(val);                          // ← sanitize before coercing
            if (spec.nums && spec.nums.includes(field)) val = num(val);
            rec[field] = val;
          });
          return rec;
        }).filter((r) => Object.values(r).some((v) => v !== "" && v !== 0 && v != null && String(v) !== r.id));
        setStaged((s) => ({ ...s, [db]: rows }));
      },
    });
  };

  const apply = () => {
    setBusy(true);
    setData((cur) => {
      const next = { ...cur };
      // import partners & clients first so relations can resolve
      DB_ORDER.forEach((db) => { if (staged[db]) next[db] = staged[db].map((r) => ({ ...r })); });
      // wire relations
      DB_ORDER.forEach((db) => {
        const spec = IMPORT_MAP[db];
        if (spec.rel && next[db]) {
          const targetRows = next[spec.rel.to];
          next[db] = next[db].map((r) => {
            const wanted = norm(r[spec.rel.field]);
            const match = targetRows.find((t) => norm(t.name) === wanted);
            const { [spec.rel.field]: _omit, ...rest } = r;
            return { ...rest, [spec.rel.set]: match ? match.id : "" };
          });
        } else if (next[db]) {
          next[db] = next[db].map((r) => { const { _studio, _client, ...rest } = r; return rest; });
        }
      });
      return next;
    });
    setTimeout(onClose, 200);
  };

  const stagedCount = Object.values(staged).reduce((a, r) => a + r.length, 0);

  return (
    <div className="sb-drawerwrap" onMouseDown={onClose}>
      <div className="sb-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sb-drawerhead">
          <span className="sb-eyebrow">Import CSVs</span>
          <button className="sb-iconbtn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: "16px 20px", overflowY: "auto" }}>
          <p style={{ fontSize: 13, color: C.ink2, marginTop: 0, lineHeight: 1.5 }}>
            Drop in any of the six files to replace that table. Studio and client names are matched automatically to
            re-link Sessions, Offers, and Follow-Ups. Headers are matched by name, so the exact column order doesn't matter.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {DB_ORDER.map((db) => (
              <div key={db} className="sb-importrow">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{sectionLabel(db)}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{IMPORT_MAP[db].file}</div>
                </div>
                {staged[db] ? <span className="sb-importok"><Check size={13} /> {staged[db].length} rows ready</span> : <span style={{ fontSize: 12, color: C.ink3 }}>current: {data[db].length}</span>}
                <label className="sb-ghost" style={{ cursor: "pointer" }}>
                  <Upload size={14} /> Choose
                  <input type="file" accept=".csv" style={{ display: "none" }} onChange={(e) => e.target.files[0] && handleFile(db, e.target.files[0])} />
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="sb-drawerfoot">
          <div style={{ flex: 1, fontSize: 12.5, color: C.ink3 }}>{stagedCount ? `${stagedCount} rows staged` : "No files chosen"}</div>
          <button className="sb-ghost" onClick={onClose}>Cancel</button>
          <button className="sb-primary" onClick={apply} disabled={!stagedCount || busy} style={{ opacity: !stagedCount ? 0.5 : 1 }}>
            Import & re-link
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PRIMITIVES
   ============================================================ */
function BreathMark({ size = 32, animate }) {
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span className={animate ? "sb-breathe" : ""} style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.35 }} />
      <span className={animate ? "sb-breathe sb-breathe2" : ""} style={{ position: "absolute", inset: size * 0.18, borderRadius: "50%", border: `1.5px solid ${C.brand}`, opacity: 0.6 }} />
      <Wind size={size * 0.42} color={C.brand} strokeWidth={1.5} />
    </span>
  );
}
function Stat({ label, value, hint, accent = C.ink, onClick }) {
  const valStr = String(value ?? "");
  const fontSize = valStr.length > 16 ? 16 : valStr.length > 10 ? 20 : 30;
  return (
    <div className="sb-card sb-stat" onClick={onClick}
      style={{ cursor: onClick ? "pointer" : "default", transition: "box-shadow .15s, transform .15s" }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = `0 6px 24px ${hexA(C.brandDeep,0.13)}`; e.currentTarget.style.transform = "translateY(-2px)"; }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; e.currentTarget.style.transform = ""; }}>
      <div style={{ fontSize: 12, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {label}
        {onClick && <ArrowUpRight size={13} color={C.ink3} strokeWidth={1.5} />}
      </div>
      <div style={{ fontFamily: FONT.display, fontSize, fontWeight: 600, color: accent, lineHeight: 1.2, margin: "6px 0 2px", wordBreak: "break-word" }}>{value}</div>
      <div style={{ fontSize: 12, color: C.ink3 }}>{hint}</div>
    </div>
  );
}
function Panel({ title, badge, onAll, children }) {
  return (
    <div className="sb-card" style={{ display: "flex", flexDirection: "column" }}>
      <div className="sb-panelhead">
        <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600 }}>{title}</span>
        {badge != null && <span className="sb-badge">{badge}</span>}
        <div style={{ flex: 1 }} />
        {onAll && <button className="sb-link" onClick={onAll}>View all <ChevronRight size={13} /></button>}
      </div>
      <div className="sb-panelbody">{children}</div>
    </div>
  );
}
function Row({ children, onClick }) { return <button className="sb-listrow" onClick={onClick}>{children}</button>; }
function Dot({ color }) { return <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />; }
function Tag({ children, color, soft }) {
  return <span style={{ display: "inline-flex", alignItems: "center", fontSize: 12, fontWeight: 600, padding: "2px 9px", borderRadius: 20, color: soft ? color : "#fff", background: soft ? hexA(color, 0.14) : color, whiteSpace: "nowrap" }}>{children}</span>;
}
function MiniChip({ children, color }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, padding: "2px 7px", borderRadius: 6, color: color || C.ink2, background: color ? hexA(color, 0.12) : C.surfaceAlt, border: `1px solid ${C.lineSoft}` }}>{children}</span>;
}
function DateChip({ iso, today }) {
  if (!iso) return <span style={{ color: C.ink3, fontSize: 12 }}>—</span>;
  const overdue = iso < today, isToday = iso === today;
  const cl = overdue ? "#C0573F" : isToday ? C.brand : C.ink2;
  return <span style={{ fontSize: 12, fontWeight: 600, color: cl, whiteSpace: "nowrap" }}>{isToday ? "Today" : overdue ? `${fmtDate(iso)} · overdue` : fmtDate(iso)}</span>;
}
function Empty({ children, pad }) {
  return <div style={{ color: C.ink3, fontSize: 13, padding: pad ? "48px 20px" : "14px 4px", textAlign: pad ? "center" : "left" }}>{children}</div>;
}

/* ---------- tiny utils ---------- */
function cleanName(n) { return String(n || "").replace(/^Sample\s*-\s*/i, ""); }
function clientShort(n) { return cleanName(n); }
function sectionLabel(db) { return { clients: "Clients", partners: "Studio Partners", sessions: "Sessions", offers: "Offers & Sales", content: "Content & Referral", followups: "Follow-Ups", revenue: "Revenue", expenses: "Expenses", testimonials: "Testimonials", templates: "Templates", referrals: "Referrals", outreach: "Outreach Hub", registrations: "Calendly Registrations" }[db] || db; }
function hexA(hex, a) {
  const h = (hex || "#000").replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/* ============================================================
   REFERRAL TREE VIEW
   ============================================================ */

/* ============================================================
   OUTREACH HUB
   ============================================================ */

/* ── FOLLOW-UP SEND EMAIL BUTTON (inline table action) ── */
function FollowUpSendButton({ r, data, setData, today }) {
  const clients      = data.clients   || [];
  const libraryTmpls = data.templates || [];
  const client       = clients.find(c => c.id === r.clientId);

  const fuOptions = FU_STEPS.map(s => ({
    id: `fu_${s.id}`, name: s.label, category: "Follow-Up Sequence",
    channel: s.channel, body: FU_TEMPLATES[s.id] || "", subject: `Follow-up: ${r.name}`,
  }));
  const allOptions = [...libraryTmpls, ...fuOptions];
  const firstOpt   = allOptions[0];

  // All hooks must come before any conditional return
  const [open, setOpen]             = useState(false);
  const [selectedId, setSelectedId] = useState(firstOpt?.id || "");
  const [subject, setSubject]       = useState("");
  const [body, setBody]             = useState("");
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState("");
  // Local completed flag — persists immediately after send without waiting for prop re-render
  const [completed, setCompleted]   = useState(false);

  // Show done badge if locally completed OR if r.outcome is already set (e.g. on load)
  if (completed || r.outcome) {
    return <span style={{ fontSize: 12, fontWeight: 600, color: "#4A8C6F", background: hexA("#4A8C6F", 0.1), border: `1px solid ${hexA("#4A8C6F", 0.25)}`, borderRadius: 20, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4 }}><Check size={11} /> {r.outcome || "Email sent"}</span>;
  }

  const populate = (tmpl) => {
    const full  = (client?.name || "there").trim();
    const first = full.split(" ")[0];
    const rep = (s) => (s||"")
      .replace(/\{\{ClientName\}\}/gi, full).replace(/\{\{FirstName\}\}/gi, first)
      .replace(/\{first_name\}/g, first).replace(/\{name\}/g, full)
      .replace(/\{\{Email\}\}/gi, client?.email || "")
      .replace(/\{session_name\}/g, r.name || "our session");
    return { body: rep(tmpl?.body || ""), subject: rep(tmpl?.subject || "") || `Follow-up: ${r.name}` };
  };

  const handleOpen = () => {
    const tmpl = allOptions.find(t => t.id === selectedId) || firstOpt;
    if (tmpl) { const { body: b, subject: s } = populate(tmpl); setBody(b); setSubject(s); setSelectedId(tmpl.id); }
    setOpen(true);
  };

  const applyTmpl = (id) => {
    const tmpl = allOptions.find(t => t.id === id);
    if (!tmpl) return;
    const { body: b, subject: s } = populate(tmpl);
    setBody(b); setSubject(s); setSelectedId(id);
  };

  const send = async () => {
    if (!client?.email) return;
    setSending(true); setError("");
    try {
      const secret = import.meta.env.VITE_FRONTEND_SECRET || "";
      const res  = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json", "x-frontend-secret": secret },
        body: JSON.stringify({ to: client.email, recipientName: (client.name||"").split(" ")[0], subject, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed.");
      const tmpl = allOptions.find(t => t.id === selectedId);
      const logEntry = { id: `em_${Date.now()}`, date: new Date().toISOString(), templateId: tmpl?.id || "followup", templateName: tmpl?.name || r.name, category: tmpl?.category || "Follow-Up", to: client.email, recipientName: cleanName(client.name||""), recipientType: "client", subject, body, resendId: json.id || null, sendStatus: "sent" };
      setData(d => ({
        ...d,
        emailLog: [...(d.emailLog||[]), logEntry],
        clients: (d.clients||[]).map(c => c.id === client.id ? { ...c, emailHistory: [...(c.emailHistory||[]), logEntry] } : c),
        followups: (d.followups||[]).map(f => f.id === r.id ? { ...f, outcome: "Email sent", lastContact: today } : f),
      }));
      setSent(true);
      // Brief "Sent!" feedback, then mark completed — this closes modal and shows green badge
      setTimeout(() => { setCompleted(true); }, 900);
    } catch (err) { setError(err.message); }
    setSending(false);
  };

  if (!open) {
    return (
      <button onClick={handleOpen} style={{ padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: C.brand, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        <Send size={11} /> Send Email
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 24, width: "min(520px,95vw)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 80px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>Send Email · {cleanName(client?.name || r.name)}</div>
          <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3 }}><X size={16} /></button>
        </div>
        <div style={{ fontSize: 11.5, color: C.ink3 }}>To: <strong style={{ color: C.ink2 }}>{client?.email || <span style={{ color:"#C0392B" }}>No email on file</span>}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", whiteSpace: "nowrap" }}>Template</label>
          <div style={{ position: "relative", flex: 1 }}>
            <select value={selectedId} onChange={e => applyTmpl(e.target.value)} style={{ width: "100%", padding: "6px 26px 6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink, background: C.surfaceAlt, appearance: "none", outline: "none" }}>
              {allOptions.length === 0 && <option value="">No templates yet</option>}
              {libraryTmpls.length > 0 && (
                <optgroup label="── Template Library ──">
                  {libraryTmpls.map(t => (
                    <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}{t.channel && t.channel !== "Email" ? ` [${t.channel}]` : ""}</option>
                  ))}
                </optgroup>
              )}
              <optgroup label="── Follow-Up Engine Sequences ──">
                {fuOptions.map(t => (
                  <option key={t.id} value={t.id}>{t.name} · {t.channel === "email" ? "Email" : "Text"}</option>
                ))}
              </optgroup>
            </select>
            <ChevronDown size={12} color={C.ink3} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          </div>
        </div>
        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={8} style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", outline: "none" }} />
        {error && <div style={{ fontSize: 12, color: "#C0392B" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={() => setOpen(false)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
          <button onClick={send} disabled={sending || sent || !client?.email} style={{ padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, background: sent ? "#4A8C6F" : C.brand, color: "#fff", cursor: sending || sent ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            {sent ? <><Check size={13}/> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }}/> Sending…</> : <><Send size={13}/> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function OutreachHubView({ rows, data, today, onOpen }) {
  const daysAgo  = (d) => !d ? 0  : Math.round((new Date(today) - new Date(d)) / 86400000);
  const daysAway = (d) => !d ? 999: Math.round((new Date(d) - new Date(today)) / 86400000);

  const totalPotential = rows.reduce((a, r) => a + (Number(r.revenuePotential) || 0), 0);
  const hot       = rows.filter(r => r.warmth === "Hot").length;
  const overdue   = rows.filter(r => r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status)).length;
  const noResp    = rows.filter(r => ["No response","Ghosted"].includes(r.responseStatus)).length;
  const active    = rows.filter(r => !["Won","Declined","Inactive"].includes(r.status)).length;

  // Sort by computed priority score descending
  const scored = [...rows].map(r => ({ ...r, _score: outreachScore(r, today) }))
    .sort((a, b) => b._score - a._score);

  // Group by status for kanban-like summary strip
  const byStatus = {};
  OUTREACH_STATUS.forEach(s => { byStatus[s] = rows.filter(r => r.status === s); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Total potential"   value={money(totalPotential)} hint={`${active} active targets`} accent={LANE.b2b.color} />
        <Stat label="Hot leads"         value={hot}    hint="warmth = Hot"    accent={OUTREACH_WARMTH_COLOR.Hot} />
        <Stat label="Overdue follow-up" value={overdue} hint="next follow-up passed" accent={overdue > 0 ? "#C0573F" : C.ink3} />
        <Stat label="No response"       value={noResp} hint="ghosted or silent"     accent={noResp > 2 ? C.gold : C.ink3} />
      </div>

      {/* Pipeline strip */}
      <div className="sb-card" style={{ padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
          Pipeline by stage
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {OUTREACH_STATUS.filter(s => s !== "Inactive").map(s => {
            const count = (byStatus[s] || []).length;
            const color = OUTREACH_STATUS_COLOR[s];
            return (
              <div key={s} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 14px", borderRadius: 10, minWidth: 80, flex: "1 1 80px",
                background: count > 0 ? hexA(color, 0.1) : C.surfaceAlt,
                border: `1px solid ${count > 0 ? hexA(color, 0.3) : C.line}`,
              }}>
                <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: count > 0 ? color : C.ink3 }}>{count}</span>
                <span style={{ fontSize: 10.5, color: C.ink3, textAlign: "center", lineHeight: 1.3, marginTop: 2 }}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Target list */}
      <div className="sb-card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "13px 16px 11px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>All targets</span>
          <span style={{ fontSize: 12, color: C.ink3 }}>ranked by priority score</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: LANE.b2b.color, fontWeight: 600 }}>{rows.length} targets</span>
        </div>

        {scored.length === 0
          ? <div style={{ padding: 24, textAlign: "center", color: C.ink3 }}>No outreach targets yet — add your first one.</div>
          : scored.map((r, i) => {
            const warmthColor  = OUTREACH_WARMTH_COLOR[r.warmth]  || C.ink3;
            const statusColor  = OUTREACH_STATUS_COLOR[r.status]  || C.ink3;
            const priorityColor= OUTREACH_PRIORITY_COLOR[r.priority] || C.ink3;
            const isOverdue    = r.nextFollowUp && r.nextFollowUp < today && !["Won","Declined","Inactive"].includes(r.status);
            const daysDue      = daysAway(r.nextFollowUp);

            return (
              <button key={r.id} onClick={() => onOpen(r)}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  background: "transparent", border: "none",
                  borderBottom: i < scored.length - 1 ? `1px solid ${C.lineSoft || C.line}` : "none",
                  cursor: "pointer", textAlign: "left" }}
                className="sb-listrow"
              >
                {/* Score badge */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: hexA(LANE.b2b.color, 0.1),
                  border: `1px solid ${hexA(LANE.b2b.color, 0.25)}`, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 700, color: LANE.b2b.color, lineHeight: 1 }}>{r._score}</span>
                  <span style={{ fontSize: 8.5, color: C.ink3, lineHeight: 1.2 }}>score</span>
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: C.ink }}>{r.name}</span>
                    {/* Warmth dot */}
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: warmthColor, flexShrink: 0 }} title={r.warmth} />
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: hexA(statusColor, 0.12), color: statusColor }}>{r.status}</span>
                    {isOverdue && <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                      background: "#FFF0EE", color: "#C0573F", border: "1px solid #F5C4BC" }}>
                      {r.nextFollowUp < today ? `Overdue ${daysAgo(r.nextFollowUp)}d` : "Due today"}</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 3 }}>
                    {r.contactName && <span>{r.contactName} · </span>}
                    <span>{r.targetType}</span>
                    {r.location && <span> · {r.location}</span>}
                    {r.lastContact && <span> · Last contact {daysAgo(r.lastContact)}d ago</span>}
                    {r.nextFollowUp && !isOverdue && daysDue <= 7 && <span> · Follow-up in {daysDue}d</span>}
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                  {Number(r.revenuePotential) > 0 && (
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: LANE.b2b.color }}>{money(r.revenuePotential)}</span>
                  )}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                    background: hexA(priorityColor, 0.1), color: priorityColor }}>{r.priority}</span>
                  <span style={{ fontSize: 10.5, color: C.ink3 }}>{r.source}</span>
                </div>

                <ChevronRight size={13} color={C.ink3} style={{ flexShrink: 0 }} />
              </button>
            );
          })}
      </div>
    </div>
  );
}

/* ============================================================
   REFERRAL TREE
   ============================================================ */

/* ── WORKFLOWS COMMAND CENTER ── */
function buildWorkflows(data, today) {
  const clients   = data.clients   || [];
  const partners  = data.partners  || [];
  const sessions  = data.sessions  || [];
  const offers    = data.offers    || [];
  const referrals = data.referrals || [];

  const daysSince = (d) => d ? Math.round((new Date(today) - new Date(d)) / 86400000) : 999;
  const past = (d) => d && new Date(d) <= new Date(today);

  /* ── 1. Client Journey ── */
  const cLead    = clients.filter(c => ["High-value lead"].includes(c.clientType) || c.status === "Lead");
  const cFirst   = clients.filter(c => c.clientType === "First-time attendee" || (c.sessionsAttended === 1 && !["Advocate","Referral source"].includes(c.clientType)));
  const cRepeat  = clients.filter(c => ["Repeat attendee","Member","Private client","Corporate attendee","Virtual attendee"].includes(c.clientType) || c.sessionsAttended >= 3);
  const cAdvocate= clients.filter(c => ["Advocate","Referral source"].includes(c.clientType));
  const cLostOrDormant = clients.filter(c => c.clientType === "Past client needing reactivation");

  /* ── 2. Studio Pipeline ── */
  const TARGET_STAGES  = ["Target identified","Researched","Initial outreach sent","Follow-up needed"];
  const DEMO_STAGES    = ["Discovery call booked","Demo session offered","Demo completed"];
  const PILOT_STAGES   = ["Pilot proposed","Agreement sent","Agreement signed","First session scheduled","Pilot completed"];
  const PARTNER_STAGES = ["Recurring partner"];

  const pTarget  = partners.filter(p => TARGET_STAGES.includes(p.stage));
  const pDemo    = partners.filter(p => DEMO_STAGES.includes(p.stage));
  const pPilot   = partners.filter(p => PILOT_STAGES.includes(p.stage));
  const pPartner = partners.filter(p => PARTNER_STAGES.includes(p.stage));

  const pStuck   = [...pTarget, ...pDemo, ...pPilot].filter(p => daysSince(p.lastTouch) > 14);
  const pPipeVal = [...pTarget, ...pDemo, ...pPilot].reduce((s, p) => s + (p.revenuePotential || 0), 0);

  /* ── 3. Session Lifecycle ── */
  const sScheduled  = sessions.filter(s => s.status === "Planned");
  const sPromoted   = sessions.filter(s => ["Booking open","Promotion active","Almost full"].includes(s.status));
  const sDelivered  = sessions.filter(s => s.status === "Completed");
  const sFollowedUp = sessions.filter(s => s.followUpSent || s.status === "Follow-up pending");
  const sClosed     = sessions.filter(s => s.status === "Closed out");
  const sStuck      = sScheduled.filter(s => past(s.date));  // session date passed but still "Planned"
  const sRevTotal   = sDelivered.reduce((sum, s) => sum + (s.netRevenue || s.revenue || 0), 0);

  /* ── 4. Offer Pipeline ── */
  const oMade    = offers.filter(o => ["Drafted","Sent","Viewed"].includes(o.status));
  const oFollowUp= offers.filter(o => o.status === "Follow-up due");
  const oWon     = offers.filter(o => ["Accepted","Paid"].includes(o.status));
  const oLost    = offers.filter(o => ["Declined","Expired"].includes(o.status));
  const oStuck   = oMade.filter(o => past(o.followUpDate));
  const oPipeVal = [...oMade, ...oFollowUp].reduce((s, o) => s + (o.price || 0), 0);
  const oWonVal  = oWon.reduce((s, o) => s + (o.price || 0), 0);

  /* ── 5. Referral Pipeline ── */
  const rfReferred  = referrals.filter(r => r.status === "Referred");
  const rfContacted = referrals.filter(r => r.status === "Contacted");
  const rfAttended  = referrals.filter(r => r.status === "Attended");
  const rfPurchased = referrals.filter(r => r.status === "Purchased");
  const rfThanked   = referrals.filter(r => r.thankYouSent);
  const rfStuck     = rfReferred.filter(r => daysSince(r.date) > 14);
  const rfRevenue   = rfPurchased.reduce((s, r) => s + (r.revenue || 0), 0);

  const conversion = (a, b) => a + b === 0 ? null : Math.round((b / (a + b)) * 100);

  return [
    {
      id: "client_journey",
      label: "Client Journey",
      subtitle: "Lead → Client → Repeat → Advocate",
      lane: "b2c",
      color: C.brand,
      bg: C.brandSoft,
      stuckCount: cLead.filter(c => !c.nextSession || past(c.nextSession)).length,
      stuckLabel: "leads with no upcoming session",
      stages: [
        { id: "lead",     label: "Lead",          color: "#D9892B", count: cLead.length,     value: null,       records: cLead,     tip: "Not yet attended any session" },
        { id: "first",    label: "First Session", color: C.brand,   count: cFirst.length,    value: null,       records: cFirst,    tip: "Attended exactly one session" },
        { id: "repeat",   label: "Repeat Client", color: "#2E6FB0", count: cRepeat.length,   value: cRepeat.reduce((s,c)=>s+(c.lifetimeValue||0),0), records: cRepeat,  tip: "3+ sessions or package purchased" },
        { id: "advocate", label: "Advocate",      color: "#4A8C6F", count: cAdvocate.length, value: cAdvocate.reduce((s,c)=>s+(c.lifetimeValue||0),0), records: cAdvocate, tip: "Actively referring others" },
      ],
      kpis: [
        { label: "Total in pipeline", value: clients.length },
        { label: "Dormant / reactivate", value: cLostOrDormant.length },
        { label: "Referrals from advocates", value: referrals.filter(r => cAdvocate.find(c => c.id === r.referrerId)).length },
      ],
      nextAction: cLead.length > 0 ? `Follow up with ${cLead.length} lead${cLead.length > 1 ? "s" : ""} not yet booked` : null,
    },
    {
      id: "studio_pipeline",
      label: "Studio Pipeline",
      subtitle: "Target → Demo → Pilot → Recurring Partner",
      lane: "b2b",
      color: "#6B5CE7",
      bg: "#EEEAFF",
      stuckCount: pStuck.length,
      stuckLabel: "studios with no contact in 14+ days",
      stages: [
        { id: "target",  label: "Target / Outreach", color: "#9E9E9E",  count: pTarget.length,  value: pTarget.reduce((s,p)=>s+(p.revenuePotential||0),0),  records: pTarget,  tip: "Identified but not yet in demo stage" },
        { id: "demo",    label: "Demo",              color: "#6B5CE7",  count: pDemo.length,    value: pDemo.reduce((s,p)=>s+(p.revenuePotential||0),0),    records: pDemo,    tip: "Discovery call through demo completed" },
        { id: "pilot",   label: "Pilot / Agreement", color: "#2E6FB0",  count: pPilot.length,   value: pPilot.reduce((s,p)=>s+(p.revenuePotential||0),0),   records: pPilot,   tip: "Proposal to agreement signed" },
        { id: "partner", label: "Recurring Partner", color: "#4A8C6F",  count: pPartner.length, value: pPartner.reduce((s,p)=>s+(p.revenuePotential||0),0), records: pPartner, tip: "Active recurring studio" },
      ],
      kpis: [
        { label: "Pipeline value", value: "$" + money(pPipeVal) },
        { label: "Stuck / overdue", value: pStuck.length },
        { label: "Active partners", value: pPartner.length },
      ],
      nextAction: pStuck.length > 0 ? `Re-engage ${pStuck.length} studio${pStuck.length > 1 ? "s" : ""} — no contact in 14+ days` : pDemo.length > 0 ? `Send pilot proposal to ${pDemo.length} demo-stage studio${pDemo.length > 1 ? "s" : ""}` : null,
    },
    {
      id: "session_lifecycle",
      label: "Session Lifecycle",
      subtitle: "Scheduled → Promoted → Delivered → Followed Up → Rebooked",
      lane: "core",
      color: C.gold,
      bg: hexA(C.gold, 0.12),
      stuckCount: sStuck.length,
      stuckLabel: "sessions past their date still marked Planned",
      stages: [
        { id: "sched",  label: "Scheduled",    color: "#9E9E9E",  count: sScheduled.length,  value: null, records: sScheduled,  tip: "Planned, not yet promoted" },
        { id: "promo",  label: "Promoted",     color: C.gold,     count: sPromoted.length,   value: null, records: sPromoted,   tip: "Booking open through almost full" },
        { id: "deliv",  label: "Delivered",    color: C.brand,    count: sDelivered.length,  value: sRevTotal, records: sDelivered,  tip: "Session completed" },
        { id: "fup",    label: "Followed Up",  color: "#6B5CE7",  count: sFollowedUp.length, value: null, records: sFollowedUp, tip: "Follow-up email sent" },
        { id: "closed", label: "Closed Out",   color: "#4A8C6F",  count: sClosed.length,     value: null, records: sClosed,     tip: "Revenue reconciled and closed" },
      ],
      kpis: [
        { label: "Revenue delivered", value: "$" + money(sRevTotal) },
        { label: "Needing follow-up", value: sDelivered.filter(s => !s.followUpSent).length },
        { label: "Sessions past date, stuck", value: sStuck.length },
      ],
      nextAction: sDelivered.filter(s => !s.followUpSent).length > 0
        ? `Send follow-up for ${sDelivered.filter(s => !s.followUpSent).length} completed session${sDelivered.filter(s => !s.followUpSent).length > 1 ? "s" : ""}`
        : sStuck.length > 0 ? `Update status on ${sStuck.length} overdue session${sStuck.length > 1 ? "s" : ""}` : null,
    },
    {
      id: "offer_pipeline",
      label: "Offer Pipeline",
      subtitle: "Offer Made → Followed Up → Closed / Won / Lost",
      lane: "b2c",
      color: C.brand,
      bg: C.brandSoft,
      stuckCount: oStuck.length,
      stuckLabel: "offers past follow-up date with no action",
      stages: [
        { id: "made",    label: "Made / Sent",   color: "#D9892B",  count: oMade.length,     value: oPipeVal, records: oMade,     tip: "Drafted, sent, or viewed" },
        { id: "followup",label: "Follow-up Due", color: C.gold,     count: oFollowUp.length, value: oFollowUp.reduce((s,o)=>s+(o.price||0),0), records: oFollowUp, tip: "Waiting on response" },
        { id: "won",     label: "Won / Paid",    color: "#4A8C6F",  count: oWon.length,      value: oWonVal,  records: oWon,      tip: "Accepted or fully paid" },
        { id: "lost",    label: "Declined / Lost",color: "#C0392B", count: oLost.length,     value: oLost.reduce((s,o)=>s+(o.price||0),0), records: oLost, tip: "Declined or expired" },
      ],
      kpis: [
        { label: "Open pipeline", value: "$" + money(oPipeVal) },
        { label: "Won revenue", value: "$" + money(oWonVal) },
        { label: "Conversion rate", value: (oWon.length + oLost.length) > 0 ? Math.round(oWon.length / (oWon.length + oLost.length) * 100) + "%" : "—" },
      ],
      nextAction: oStuck.length > 0 ? `Follow up on ${oStuck.length} overdue offer${oStuck.length > 1 ? "s" : ""}` : oFollowUp.length > 0 ? `${oFollowUp.length} offer${oFollowUp.length > 1 ? "s" : ""} need follow-up today` : null,
    },
    {
      id: "referral_pipeline",
      label: "Referral Pipeline",
      subtitle: "Referred → Booked → Thanked → Tracked",
      lane: "b2c",
      color: "#4A8C6F",
      bg: hexA("#4A8C6F", 0.1),
      stuckCount: rfStuck.length,
      stuckLabel: "referrals not yet contacted in 14+ days",
      stages: [
        { id: "referred",  label: "Referred",   color: "#9E9E9E",  count: rfReferred.length,  value: null,     records: rfReferred,  tip: "Referred but not yet booked" },
        { id: "contacted", label: "Contacted",  color: "#D9892B",  count: rfContacted.length, value: null,     records: rfContacted, tip: "In conversation, not yet attended" },
        { id: "attended",  label: "Attended",   color: C.brand,    count: rfAttended.length,  value: null,     records: rfAttended,  tip: "Attended at least one session" },
        { id: "purchased", label: "Purchased",  color: "#4A8C6F",  count: rfPurchased.length, value: rfRevenue, records: rfPurchased, tip: "Purchased a session or package" },
      ],
      kpis: [
        { label: "Referral revenue", value: "$" + money(rfRevenue) },
        { label: "Awaiting thank-you", value: referrals.filter(r => !r.thankYouSent && r.status !== "Referred").length },
        { label: "Conversion rate", value: referrals.length > 0 ? Math.round(rfPurchased.length / referrals.length * 100) + "%" : "—" },
      ],
      nextAction: rfStuck.length > 0 ? `Follow up on ${rfStuck.length} stale referral${rfStuck.length > 1 ? "s" : ""}` : referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length > 0 ? `Send thank-you to ${referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length} referrer${referrals.filter(r => !r.thankYouSent && ["Attended","Purchased"].includes(r.status)).length > 1 ? "s" : ""}` : null,
    },
  ];
}

function WorkflowsView({ data, derived, today }) {
  const [expanded, setExpanded] = useState(null);
  const workflows = useMemo(() => buildWorkflows(data, today), [data, today]);

  const totalInMotion = workflows.reduce((s, w) => s + w.stages.reduce((ss, st) => ss + st.count, 0), 0);
  const totalStuck    = workflows.reduce((s, w) => s + w.stuckCount, 0);
  const hasActions    = workflows.filter(w => w.nextAction).length;

  const LANE_META = {
    b2c:  { label: "B2C", color: C.brand,   bg: C.brandSoft  },
    b2b:  { label: "B2B", color: "#6B5CE7", bg: "#EEEAFF"    },
    core: { label: "OPS", color: C.ink2,    bg: C.surfaceAlt },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Header stats */}
      <div className="sb-stats">
        <Stat label="Active workflows"       value={5}               hint="running in parallel" />
        <Stat label="Records in motion"      value={totalInMotion}   hint="across all pipelines" />
        <Stat label="Stuck / needs action"   value={totalStuck}      hint="records overdue"       accent={totalStuck > 0 ? "#D9892B" : "#4A8C6F"} />
        <Stat label="Workflows with actions" value={hasActions}      hint="requiring attention"   accent={hasActions > 0 ? C.brand : "#4A8C6F"} />
      </div>

      {/* Workflow cards */}
      {workflows.map(wf => {
        const isOpen = expanded === wf.id;
        const lane   = LANE_META[wf.lane] || LANE_META.core;

        return (
          <div key={wf.id} style={{
            background: C.surface, border: `1px solid ${C.line}`, borderRadius: 14,
            overflow: "hidden", boxShadow: isOpen ? `0 2px 12px ${hexA(wf.color, 0.12)}` : "none",
            borderLeft: `4px solid ${wf.color}`,
          }}>

            {/* Card header */}
            <div
              onClick={() => setExpanded(isOpen ? null : wf.id)}
              style={{ padding: "14px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                background: isOpen ? hexA(wf.color, 0.04) : C.surface,
                borderBottom: isOpen ? `1px solid ${C.line}` : "none",
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 800, fontSize: 14.5, color: C.ink }}>{wf.label}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
                    background: lane.bg, color: lane.color }}>{lane.label}</span>
                  {wf.stuckCount > 0 && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "1px 8px", borderRadius: 10,
                      background: hexA("#D9892B", 0.12), color: "#9A5D10" }}>⚠ {wf.stuckCount} stuck</span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: C.ink3 }}>{wf.subtitle}</div>
              </div>

              {/* Stage summary chips */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                {wf.stages.map((st, i) => (
                  <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {i > 0 && <ChevronRight size={12} color={C.ink3} />}
                    <div style={{
                      minWidth: 40, textAlign: "center", padding: "5px 10px", borderRadius: 8,
                      background: st.count > 0 ? hexA(st.color, 0.12) : C.surfaceAlt,
                      border: `1px solid ${st.count > 0 ? hexA(st.color, 0.3) : C.line}`,
                    }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: st.count > 0 ? st.color : C.ink3, lineHeight: 1 }}>{st.count}</div>
                      <div style={{ fontSize: 9.5, color: C.ink3, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap" }}>{st.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Pipeline visualization */}
                <div style={{ display: "flex", alignItems: "stretch", gap: 0, overflowX: "auto", paddingBottom: 4 }}>
                  {wf.stages.map((st, i) => {
                    const next = wf.stages[i + 1];
                    const convRate = next ? (st.count + next.count > 0 ? Math.round(next.count / Math.max(st.count, 1) * 100) : null) : null;
                    return (
                      <div key={st.id} style={{ display: "flex", alignItems: "center", flex: 1, minWidth: 120 }}>
                        {/* Stage box */}
                        <div style={{
                          flex: 1, background: hexA(st.color, 0.07), border: `1px solid ${hexA(st.color, 0.25)}`,
                          borderRadius: 10, padding: "14px 14px 12px",
                        }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                            <span style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: st.count > 0 ? st.color : C.ink3, lineHeight: 1 }}>{st.count}</span>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.ink, marginBottom: 3 }}>{st.label}</div>
                          {st.value != null && st.value > 0 && (
                            <div style={{ fontSize: 11, color: st.color, fontWeight: 600 }}>${money(st.value)}</div>
                          )}
                          <div style={{ fontSize: 10.5, color: C.ink3, marginTop: 4, lineHeight: 1.4 }}>{st.tip}</div>
                        </div>

                        {/* Arrow + conversion */}
                        {i < wf.stages.length - 1 && (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px", minWidth: 42, flexShrink: 0 }}>
                            <ChevronRight size={18} color={wf.color} />
                            {convRate != null && (
                              <span style={{ fontSize: 10, color: convRate > 50 ? "#4A8C6F" : convRate > 25 ? "#D9892B" : "#C0392B", fontWeight: 700, marginTop: 2 }}>
                                {convRate}%
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* KPIs + next action */}
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>

                  {/* KPIs */}
                  <div style={{ display: "flex", gap: 10, flex: 1, flexWrap: "wrap" }}>
                    {wf.kpis.map(k => (
                      <div key={k.label} style={{ background: C.surfaceAlt, borderRadius: 8, padding: "8px 14px", minWidth: 120 }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: C.ink, fontFamily: FONT.display }}>{k.value}</div>
                        <div style={{ fontSize: 11, color: C.ink3, fontWeight: 500 }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Next action */}
                  {wf.nextAction && (
                    <div style={{
                      background: hexA(wf.color, 0.08), border: `1px solid ${hexA(wf.color, 0.25)}`,
                      borderRadius: 10, padding: "12px 16px", minWidth: 220, flex: 1,
                      display: "flex", alignItems: "flex-start", gap: 10,
                    }}>
                      <Zap size={16} color={wf.color} style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: wf.color, marginBottom: 3, textTransform: "uppercase", letterSpacing: ".05em" }}>Next action</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.4 }}>{wf.nextAction}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stuck alert */}
                {wf.stuckCount > 0 && (
                  <div style={{ background: hexA("#D9892B", 0.08), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 8, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                    <AlertCircle size={14} color="#D9892B" />
                    <span style={{ fontSize: 12.5, color: "#9A5D10" }}>
                      <strong>{wf.stuckCount} record{wf.stuckCount > 1 ? "s" : ""}</strong> — {wf.stuckLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Workflow health summary */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 20px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>Pipeline health</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }} className="sb-grid5">
          {workflows.map(wf => {
            const totalCount = wf.stages.reduce((s, st) => s + st.count, 0);
            const lastStage  = wf.stages[wf.stages.length - 1];
            const health = totalCount === 0 ? "empty"
              : wf.stuckCount > 1 ? "blocked"
              : wf.stuckCount === 1 ? "caution"
              : lastStage.count > 0 ? "flowing"
              : "active";
            const healthColor = { empty: C.ink3, blocked: "#C0392B", caution: "#D9892B", flowing: "#4A8C6F", active: C.brand }[health];
            const healthLabel = { empty: "Empty", blocked: "Blocked", caution: "Caution", flowing: "Flowing", active: "Active" }[health];
            return (
              <div key={wf.id} onClick={() => setExpanded(wf.id === expanded ? null : wf.id)}
                style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                  background: hexA(healthColor, 0.07), border: `1px solid ${hexA(healthColor, 0.2)}` }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: healthColor, margin: "0 auto 6px" }} />
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink, marginBottom: 2 }}>{wf.label.split(" ")[0]}</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: healthColor }}>{healthLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── USER MANAGEMENT VIEW ── */
function UserManagementView({ currentUser, secUsers, masterKeyRaw, onUsersUpdated, onConfirm }) {
  const [showAdd, setShowAdd]     = useState(false);
  const [editUser, setEditUser]   = useState(null);   // user being edited
  const [newName, setNewName]     = useState("");
  const [newRole, setNewRole]     = useState("Editor");
  const [newPin, setNewPin]       = useState("");
  const [newPerm, setNewPerm]     = useState({ ...ROLE_PERMISSIONS.Editor });
  const [showPin, setShowPin]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [msg, setMsg]             = useState("");

  const canManage = currentUser?.role === "Owner" || currentUser?.permissions?.manage;
  const initials  = (name) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(""), 2800); };

  const applyRoleDefaults = (role) => {
    setNewRole(role);
    setNewPerm({ ...ROLE_PERMISSIONS[role] });
  };

  const handleAdd = async () => {
    if (!newName.trim() || !newPin.trim()) return;
    if (newPin.length < 6) { flash("PIN must be at least 6 characters."); return; }
    if (!masterKeyRaw)    { flash("Session key unavailable — please log out and back in."); return; }
    setSaving(true);
    try {
      const pinSalt  = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPin, pinSalt, Sec.PBKDF2_ITERATIONS);
      const color    = USER_COLORS[secUsers.length % USER_COLORS.length];
      const nu = {
        id: "u_" + Math.random().toString(36).slice(2, 9),
        name: newName.trim(), role: newRole,
        pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS,
        permissions: { ...newPerm },
        active: true, color, createdAt: todayISO(), lastLogin: "",
      };
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) sec.users = [];
      const updated = { ...sec, version: 2, users: [...sec.users, nu] };
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      setShowAdd(false); setNewName(""); setNewPin(""); setNewRole("Editor");
      flash(`✓ ${nu.name} added successfully`);
    } catch (e) { console.error("handleAdd error:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleUpdatePerms = async (userId, updatedPerms, updatedRole) => {
    
    setSaving(true);
    try {
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { flash("No user config found."); setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u =>
        u.id === userId ? { ...u, permissions: updatedPerms, role: updatedRole } : u
      )};
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      setEditUser(null);
      flash("✓ Permissions updated");
    } catch (e) { console.error("handleUpdatePerms:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleResetPin = async (userId, newPinVal) => {
    if (!newPinVal.trim() || !masterKeyRaw) return;
    if (newPinVal.length < 6) { flash("New PIN must be at least 6 characters."); return; }
    setSaving(true);
    try {
      const pinSalt  = Sec.newSalt();
      const wrappedMasterKey = await Sec.wrapKeyForUser(masterKeyRaw, newPinVal, pinSalt, Sec.PBKDF2_ITERATIONS);
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { flash("No user config found."); setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u =>
        u.id === userId ? { ...u, pinSalt, wrappedMasterKey, pbkdf2Iterations: Sec.PBKDF2_ITERATIONS } : u
      )};
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      flash("✓ PIN reset successfully");
    } catch (e) { console.error("handleResetPin:", e); flash("Error: " + (e?.message || e)); }
    setSaving(false);
  };

  const handleDeactivate = async (userId) => {
    if (userId === currentUser?.id) return;
    if (onConfirm) {
      onConfirm({ message: "Deactivate this user? They will no longer be able to log in.", okLabel: "Deactivate", danger: true, onOk: () => doDeactivate(userId) });
      return;
    }
    if (!window.confirm("Deactivate this user? They will no longer be able to log in.")) return;
    doDeactivate(userId);
  };

  const doDeactivate = async (userId) => {
    setSaving(true);
    try {
      const secRaw = await store.get(SEC_META_KEY);
      const sec    = JSON.parse(secRaw?.value || "{}");
      if (!Array.isArray(sec.users)) { setSaving(false); return; }
      const updated = { ...sec, users: sec.users.map(u => u.id === userId ? { ...u, active: false } : u) };
      await store.set(SEC_META_KEY, JSON.stringify(updated));
      onUsersUpdated(updated.users.filter(u => u.active !== false));
      flash("User deactivated");
    } catch (e) { console.error("handleDeactivate:", e); }
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Total users"   value={secUsers.length} hint="active accounts" />
        <Stat label="Owner"         value={secUsers.filter(u => u.role === "Owner").length}  hint="" accent="#4A8C6F" />
        <Stat label="Editor / Admin" value={secUsers.filter(u => ["Admin","Editor"].includes(u.role)).length} hint="" accent={C.brand} />
        <Stat label="Viewer"        value={secUsers.filter(u => u.role === "Viewer").length} hint="" accent={C.ink3} />
      </div>

      {msg && (
        <div style={{ background: msg.startsWith("✓") ? hexA("#4A8C6F", 0.1) : hexA("#C0392B", 0.1),
          border: `1px solid ${hexA(msg.startsWith("✓") ? "#4A8C6F" : "#C0392B", 0.3)}`,
          borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600,
          color: msg.startsWith("✓") ? "#2D6A50" : "#C0392B" }}>{msg}</div>
      )}

      {/* Add user */}
      {canManage && (
        <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "16px 18px" }}>
          {!showAdd ? (
            <button onClick={() => setShowAdd(true)} style={{
              display: "flex", alignItems: "center", gap: 8, background: C.brand,
              color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px",
              cursor: "pointer", fontSize: 13, fontWeight: 700,
            }}><Plus size={15} /> Add User</button>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>New User</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Full name</div>
                  <input value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Sarah Chen"
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Role</div>
                  <select value={newRole} onChange={e => applyRoleDefaults(e.target.value)}
                    style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink }}>
                    {USER_ROLES.filter(r => r !== "Owner").map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>Initial PIN</div>
                <div style={{ position: "relative" }}>
                  <input type={showPin ? "text" : "password"} value={newPin} onChange={e => setNewPin(e.target.value)}
                    placeholder="Set their login PIN"
                    style={{ width: "100%", padding: "9px 44px 9px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, color: C.ink, boxSizing: "border-box" }} />
                  <button type="button" onClick={() => setShowPin(s => !s)} style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", fontSize: 10.5, color: C.ink3, fontWeight: 600,
                  }}>{showPin ? "HIDE" : "SHOW"}</button>
                </div>
              </div>
              {/* Permission toggles */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 8 }}>Permissions</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["view","edit","delete"].map(p => (
                    <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                      background: newPerm[p] ? hexA(C.brand, 0.1) : C.surfaceAlt,
                      border: `1px solid ${newPerm[p] ? C.brand : C.line}`, borderRadius: 8,
                      padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
                      color: newPerm[p] ? C.brand : C.ink3 }}>
                      <input type="checkbox" checked={!!newPerm[p]}
                        onChange={e => setNewPerm(pr => ({ ...pr, [p]: e.target.checked }))}
                        style={{ display: "none" }} />
                      {newPerm[p] ? <Check size={13} /> : null} {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleAdd} disabled={saving || !newName.trim() || !newPin.trim()} style={{
                  padding: "9px 20px", background: C.brand, color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                }}>Create User</button>
                <button onClick={() => setShowAdd(false)} style={{
                  padding: "9px 16px", background: "transparent", border: `1px solid ${C.line}`,
                  borderRadius: 8, cursor: "pointer", fontSize: 13, color: C.ink2,
                }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* User list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {secUsers.map(u => {
          const isMe   = u.id === currentUser?.id;
          const isEdit = editUser?.id === u.id;
          const [ePerm, setEPerm] = [editUser?.permissions || u.permissions, (p) => setEditUser(ev => ({ ...ev, permissions: p }))];

          return (
            <div key={u.id} style={{
              background: C.surface, border: `1px solid ${isMe ? u.color : C.line}`,
              borderRadius: 12, overflow: "hidden",
              borderLeft: `4px solid ${isMe ? u.color || C.brand : C.line}`,
            }}>
              <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                {/* Avatar */}
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: u.color || C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {initials(u.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.ink }}>{u.name}</span>
                    {isMe && <span style={{ fontSize: 10.5, background: hexA(u.color || C.brand, 0.12), color: u.color || C.brand, borderRadius: 5, padding: "1px 7px", fontWeight: 700 }}>YOU</span>}
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: hexA(USER_ROLE_COLOR[u.role] || C.ink3, 0.1),
                      color: USER_ROLE_COLOR[u.role] || C.ink3 }}>{u.role}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 5, flexWrap: "wrap" }}>
                    {["view","edit","delete"].map(p => (
                      <span key={p} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 5,
                        background: u.permissions?.[p] ? hexA("#4A8C6F", 0.1) : hexA("#C0392B", 0.08),
                        color: u.permissions?.[p] ? "#2D6A50" : "#C0392B" }}>
                        {u.permissions?.[p] ? "✓" : "✕"} {p}
                      </span>
                    ))}
                    {u.lastLogin && <span style={{ fontSize: 10.5, color: C.ink3 }}>Last login: {fmtDate(u.lastLogin)}</span>}
                  </div>
                </div>
                {canManage && u.role !== "Owner" && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setEditUser(isEdit ? null : { ...u })} style={{
                      padding: "6px 12px", border: `1px solid ${C.line}`, borderRadius: 8,
                      cursor: "pointer", fontSize: 12, fontWeight: 600, background: "transparent", color: C.ink2,
                    }}>{isEdit ? "Cancel" : "Edit"}</button>
                    {!isMe && <button onClick={() => handleDeactivate(u.id)} style={{
                      padding: "6px 10px", border: "none", borderRadius: 8,
                      cursor: "pointer", fontSize: 12, background: hexA("#C0392B", 0.08), color: "#C0392B", fontWeight: 600,
                    }}>Remove</button>}
                  </div>
                )}
              </div>

              {/* Edit panel */}
              {isEdit && (
                <EditUserPanel
                  user={editUser}
                  masterKeyRaw={masterKeyRaw}
                  onSave={(updatedPerms, updatedRole) => handleUpdatePerms(u.id, updatedPerms, updatedRole)}
                  onResetPin={(pin) => handleResetPin(u.id, pin)}
                  saving={saving}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EditUserPanel({ user, masterKeyRaw, onSave, onResetPin, saving }) {
  const [perm, setPerm]     = useState({ ...user.permissions });
  const [role, setRole]     = useState(user.role);
  const [resetPin, setResetPin] = useState("");
  const [showPin, setShowPin]   = useState(false);

  const applyRole = (r) => { setRole(r); setPerm({ ...ROLE_PERMISSIONS[r] }); };

  return (
    <div style={{ borderTop: `1px solid ${C.line}`, padding: "14px 16px", background: C.surfaceAlt, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Role */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.ink3 }}>Role:</span>
        {USER_ROLES.filter(r => r !== "Owner").map(r => (
          <button key={r} onClick={() => applyRole(r)} style={{
            padding: "5px 12px", borderRadius: 20, border: `1px solid ${role === r ? USER_ROLE_COLOR[r] : C.line}`,
            background: role === r ? hexA(USER_ROLE_COLOR[r], 0.1) : "transparent",
            color: role === r ? USER_ROLE_COLOR[r] : C.ink2, fontWeight: 600, fontSize: 12, cursor: "pointer",
          }}>{r}</button>
        ))}
      </div>
      {/* Permissions */}
      <div style={{ display: "flex", gap: 8 }}>
        {["view","edit","delete"].map(p => (
          <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
            background: perm[p] ? hexA(C.brand, 0.1) : "transparent",
            border: `1px solid ${perm[p] ? C.brand : C.line}`, borderRadius: 8,
            padding: "7px 12px", fontSize: 12.5, fontWeight: 600,
            color: perm[p] ? C.brand : C.ink3 }}>
            <input type="checkbox" checked={!!perm[p]} onChange={e => setPerm(pr => ({ ...pr, [p]: e.target.checked }))} style={{ display: "none" }} />
            {perm[p] ? <Check size={13} /> : null} {p.charAt(0).toUpperCase() + p.slice(1)}
          </label>
        ))}
      </div>
      {/* Reset PIN */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <input type={showPin ? "text" : "password"} value={resetPin} onChange={e => setResetPin(e.target.value)}
            placeholder="New PIN (leave blank to keep current)"
            style={{ width: "100%", padding: "8px 44px 8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 12.5, color: C.ink, boxSizing: "border-box" }} />
          <button type="button" onClick={() => setShowPin(s => !s)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 10, color: C.ink3, fontWeight: 600 }}>{showPin ? "HIDE" : "SHOW"}</button>
        </div>
        {resetPin && <button onClick={() => { onResetPin(resetPin); setResetPin(""); }} style={{
          padding: "8px 14px", background: "#D9892B", color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap",
        }}>Reset PIN</button>}
      </div>
      <button onClick={() => onSave(perm, role)} disabled={saving} style={{
        padding: "9px 20px", background: C.brand, color: "#fff",
        border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, alignSelf: "flex-start",
      }}>Save Changes</button>
    </div>
  );
}

/* ── TEMPLATE LIBRARY ── */
function TemplateLibraryView({ data, setData, onOpen, currentUser }) {
  const onUpdate = (db, id, fn) => setData(d => ({ ...d, [db]: (d[db] || []).map(r => r.id === id ? fn(r) : r) }));
  const [catFilter, setCatFilter] = useState("All");
  const [chanFilter, setChanFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);
  const [emailPreview, setEmailPreview] = useState(null); // { template, vars, recipient, recipientSearch }
  const [emailCopied, setEmailCopied]   = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent]       = useState(false);
  const [emailError, setEmailError]     = useState("");
  const [emailBodyOverride, setEmailBodyOverride] = useState(null); // user edits to the body before send

  const templates  = data.templates  || [];
  const clients    = data.clients    || [];
  const partners   = data.partners   || [];

  const filtered = templates.filter(t => {
    if (catFilter !== "All" && t.category !== catFilter) return false;
    if (chanFilter !== "All" && t.channel !== chanFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return t.name.toLowerCase().includes(q) || t.body.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q);
    }
    return true;
  });

  const copyTemplate = (t) => {
    const full = (t.subject ? `Subject: ${t.subject}\n\n` : "") + t.body;
    navigator.clipboard?.writeText(full).catch(() => {});
    setCopied(t.id);
    setTimeout(() => setCopied(null), 2000);
  };

  // Extract unique {{variable}} tokens from body + subject
  const extractVars = (t) => {
    const matches = [...(t.subject || "").matchAll(/\{\{([^}]+)\}\}/g),
                     ...(t.body   || "").matchAll(/\{\{([^}]+)\}\}/g)];
    return [...new Set(matches.map(m => m[1].trim()))];
  };

  // Map a recipient (client or partner) + current user → variable values
  // Returns { vars, autoFilledKeys } — autoFilledKeys tracks which were mapped from data
  const autoFillVars = (varKeys, recipient, type) => {
    const vals = {};
    const filled = new Set();
    const yourFirstName = (currentUser?.name || "").split(" ")[0] || "";

    const set = (k, v) => { vals[k] = v; filled.add(k); };

    varKeys.forEach(k => {
      const lk = k.toLowerCase();
      if (lk === "yourname") { set(k, yourFirstName); return; }

      if (type === "client") {
        const firstName = (recipient.name || "").split(" ")[0];
        if (lk === "clientname")       { set(k, cleanName(recipient.name || "")); return; }
        if (lk === "firstname")        { set(k, firstName); return; }
        if (lk === "email")            { set(k, recipient.email || ""); return; }
        if (lk === "phone")            { set(k, recipient.phone || ""); return; }
      }
      if (type === "partner") {
        if (lk === "studioname")       { set(k, recipient.name || ""); return; }
        if (lk === "contactname")      { set(k, recipient.contact || ""); return; }
        if (lk === "email")            { set(k, recipient.email || ""); return; }
        if (lk === "phone")            { set(k, recipient.phone || ""); return; }
        if (lk === "location")         { set(k, recipient.location || ""); return; }
        if (lk === "avgattendance" || lk === "avgattendan") { set(k, recipient.avgAttendance != null ? String(recipient.avgAttendance) : ""); return; }
        if (lk === "lastcontactdate")  { set(k, recipient.lastTouch ? fmtDate(recipient.lastTouch) : ""); return; }
        if (lk === "sessionspermonth") { set(k, recipient.sessionsPerMonth != null ? String(recipient.sessionsPerMonth) : ""); return; }
        if (lk === "revsplit")         { set(k, recipient.revShare || ""); return; }
        if (lk === "referencestudio")  { set(k, recipient.name || ""); return; }
      }
      vals[k] = ""; // not auto-fillable — manual entry
    });
    return { vars: vals, autoFilledKeys: filled };
  };

  const openEmailPreview = (t) => {
    const varKeys = extractVars(t);
    const vars = {};
    varKeys.forEach(k => { vars[k] = ""; });
    setEmailPreview({ template: t, vars, autoFilledKeys: new Set(), recipient: null, recipientSearch: "" });
    setEmailCopied(false);
    setEmailBodyOverride(null);
  };

  const selectRecipient = (recipient, type) => {
    if (!emailPreview) return;
    const varKeys = extractVars(emailPreview.template);
    const { vars, autoFilledKeys } = autoFillVars(varKeys, recipient, type);
    setEmailPreview(prev => ({ ...prev, recipient: { ...recipient, _type: type }, vars, autoFilledKeys, recipientSearch: cleanName(recipient.name || "") }));
    setEmailBodyOverride(null);
  };

  // Replace {{var}} tokens with filled values (highlight unfilled placeholders)
  const applyVars = (text, vars) =>
    (text || "").replace(/\{\{([^}]+)\}\}/g, (_, k) => vars[k.trim()] || `{{${k.trim()}}}`);

  const emailPopulatedBody    = emailPreview ? applyVars(emailPreview.template.body, emailPreview.vars) : "";
  const emailPopulatedSubject = emailPreview ? applyVars(emailPreview.template.subject || "", emailPreview.vars) : "";

  // Recipient search results (clients + partners combined)
  const recipientResults = useMemo(() => {
    if (!emailPreview) return [];
    const q = (emailPreview.recipientSearch || "").toLowerCase().trim();
    if (!q) return [];
    const matchClients  = clients.filter(c => (c.name || "").toLowerCase().includes(q)).slice(0, 6).map(c => ({ ...c, _type: "client" }));
    const matchPartners = partners.filter(p => (p.name || "").toLowerCase().includes(q)).slice(0, 4).map(p => ({ ...p, _type: "partner" }));
    return [...matchClients, ...matchPartners];
  }, [emailPreview?.recipientSearch, clients, partners]);

  // Which vars need manual input — those NOT auto-filled from the recipient (stable, doesn't change as user types)
  const manualVars = emailPreview
    ? Object.keys(emailPreview.vars).filter(k => !emailPreview.autoFilledKeys?.has(k))
    : [];

  const copyEmailText = () => {
    const full = (emailPopulatedSubject ? `Subject: ${emailPopulatedSubject}\n\n` : "") + emailPopulatedBody;
    navigator.clipboard?.writeText(full).catch(() => {});
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  const sendEmail = async () => {
    if (!emailPreview?.recipient || emailSending) return;
    const recipientEmail = emailPreview.recipient.email;
    if (!recipientEmail) { setEmailError("Recipient has no email address on file."); return; }

    setEmailSending(true);
    setEmailError("");
    try {
      const secret = import.meta.env.VITE_FRONTEND_SECRET || "";
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-frontend-secret": secret },
        body: JSON.stringify({
          to:            recipientEmail,
          recipientName: emailPreview.recipient._type === "partner"
            ? (emailPreview.recipient.contact || emailPreview.recipient.name || "")
            : cleanName(emailPreview.recipient.name || ""),
          subject:       emailPopulatedSubject || emailPreview.template.name,
          body:          emailBodyOverride ?? emailPopulatedBody,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed.");

      // ── Workflow updates after successful send ──
      const tmpl     = emailPreview.template;
      const recip    = emailPreview.recipient;
      const today    = new Date().toISOString().slice(0, 10);
      const logEntry = {
        id:            `em_${Date.now()}`,
        date:          new Date().toISOString(),
        templateId:    tmpl.id,
        templateName:  tmpl.name,
        category:      tmpl.category || "",
        to:            recipientEmail,
        recipientName: recip._type === "partner"
          ? (recip.contact || recip.name || "")
          : cleanName(recip.name || ""),
        recipientType: recip._type,
        subject:       emailPopulatedSubject || tmpl.name,
        body:          emailBodyOverride ?? emailPopulatedBody,
        resendId:      json.id || null,
        sendStatus:    "sent",
      };

      // ── Write to global email log ──
      setData(d => ({ ...d, emailLog: [...(d.emailLog || []), logEntry] }));

      if (recip._type === "partner") {
        // Update lastTouch on partner + append to emailHistory
        onUpdate("partners", recip.id, p => ({ ...p, lastTouch: today, emailHistory: [...(p.emailHistory || []), logEntry] }));
      } else if (recip._type === "client") {
        // Log send on client record
        onUpdate("clients", recip.id, c => ({ ...c, emailHistory: [...(c.emailHistory || []), logEntry] }));
        // If Post-Session or Operations template, also mark followUpSent on most-recent unactioned session for this client
        if (["Post-Session", "Operations"].includes(tmpl.category)) {
          const sessions = data.sessions || [];
          const regs = (data.registrations || []).filter(r => r.clientId === recip.id);
          const sessionIds = new Set(regs.map(r => r.sessionId));
          const target = sessions.find(s => sessionIds.has(s.id) && !s.followUpSent && s.status !== "Planned");
          if (target) onUpdate("sessions", target.id, s => ({ ...s, followUpSent: true }));
        }
      }

      setEmailSent(true);
      setTimeout(() => { setEmailSent(false); setEmailPreview(null); }, 2000);
    } catch (err) {
      // Log the failed send attempt to the global email log
      const tmplFail  = emailPreview?.template;
      const recipFail = emailPreview?.recipient;
      if (tmplFail && recipFail) {
        const failEntry = {
          id:            `em_${Date.now()}`,
          date:          new Date().toISOString(),
          templateId:    tmplFail.id,
          templateName:  tmplFail.name,
          category:      tmplFail.category || "",
          to:            recipFail.email || "",
          recipientName: cleanName(recipFail.name || ""),
          recipientType: recipFail._type,
          subject:       emailPopulatedSubject || tmplFail.name,
          resendId:      null,
          sendStatus:    "failed",
          errorMsg:      err.message,
        };
        setData(d => ({ ...d, emailLog: [...(d.emailLog || []), failEntry] }));
      }
      setEmailError(err.message || "Failed to send. Please try again.");
    } finally {
      setEmailSending(false);
    }
  };

  // Highlight {{variables}} in body preview
  const renderWithVars = (text, maxLen = 180) => {
    const snippet = text.slice(0, maxLen) + (text.length > maxLen ? "…" : "");
    const parts = snippet.split(/({{[^}]+}})/g);
    return parts.map((p, i) =>
      /^{{/.test(p)
        ? <span key={i} style={{ background: "#EEEAFF", color: "#3D2DA0", borderRadius: 3, padding: "0 3px", fontSize: "0.9em", fontWeight: 600 }}>{p}</span>
        : p
    );
  };

  const catCounts = {};
  templates.forEach(t => { catCounts[t.category] = (catCounts[t.category] || 0) + 1; });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Stats row */}
      <div className="sb-stats">
        <Stat label="Total templates"   value={templates.length}                             hint="ready to use" />
        <Stat label="Email"             value={templates.filter(t=>t.channel==="Email").length} hint="email templates" accent="#D9892B" />
        <Stat label="SMS"               value={templates.filter(t=>t.channel==="SMS").length}   hint="text message templates" accent="#4A8C6F" />
        <Stat label="Most used"         value={[...templates].sort((a,b)=>b.usageCount-a.usageCount)[0]?.name.replace("","")||"—"} hint="by usage count" />
      </div>

      {/* Filters */}
      <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div className="sb-search" style={{ minWidth: 180, flex: 1 }}>
          <Search size={14} color={C.ink3} />
          <input placeholder="Search templates…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Category tabs */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {["All", ...TMPL_CATEGORY].map(cat => {
            const active = catFilter === cat;
            const color  = cat === "All" ? C.brand : TMPL_CATEGORY_COLOR[cat];
            return (
              <button key={cat} onClick={() => setCatFilter(cat)} style={{
                padding: "4px 11px", borderRadius: 20, border: "1px solid", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                borderColor: active ? color : C.line,
                background: active ? hexA(color, 0.12) : "transparent",
                color: active ? color : C.ink2,
              }}>{cat}{cat !== "All" && catCounts[cat] ? ` (${catCounts[cat]})` : ""}</button>
            );
          })}
        </div>
        {/* Channel tabs */}
        <div style={{ display: "flex", gap: 5 }}>
          {["All","Email","SMS","DM"].map(ch => {
            const active = chanFilter === ch;
            const color  = ch === "All" ? C.ink2 : TMPL_CHANNEL_COLOR[ch];
            return (
              <button key={ch} onClick={() => setChanFilter(ch)} style={{
                padding: "4px 11px", borderRadius: 20, border: "1px solid", fontSize: 11.5, fontWeight: 600, cursor: "pointer",
                borderColor: active ? color : C.line,
                background: active ? hexA(color, 0.12) : "transparent",
                color: active ? color : C.ink2,
              }}>{ch}</button>
            );
          })}
        </div>
      </div>

      {/* Email preview modal */}
      {emailPreview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setEmailPreview(null); }}>
          <div style={{ background: C.surface, borderRadius: 16, boxShadow: "0 8px 48px rgba(0,0,0,0.22)", width: "100%", maxWidth: 1050, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

            {/* Header */}
            <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 10 }}>
              <Mail size={16} color="#2563EB" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: C.ink }}>{emailPreview.template.name}</div>
                <div style={{ fontSize: 11.5, color: C.ink3, marginTop: 1 }}>Select a recipient to auto-populate the message</div>
              </div>
              <button onClick={() => setEmailPreview(null)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 4, borderRadius: 6 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16, minHeight: 520 }}>

              {/* Recipient search */}
              <div style={{ position: "relative" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.05em" }}>Send to</div>
                <div style={{ position: "relative" }}>
                  <Search size={14} color={C.ink3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                  <input
                    value={emailPreview.recipientSearch}
                    onChange={e => setEmailPreview(prev => ({ ...prev, recipientSearch: e.target.value, recipient: null }))}
                    placeholder="Search clients or studio partners…"
                    style={{ width: "100%", padding: "8px 10px 8px 32px", borderRadius: 9, border: `1px solid ${C.line}`, fontSize: 13, color: C.ink, background: "#fff", boxSizing: "border-box" }}
                  />
                </div>
                {/* Dropdown results */}
                {recipientResults.length > 0 && !emailPreview.recipient && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.12)", zIndex: 10, marginTop: 4, overflow: "hidden" }}>
                    {recipientResults.map(r => (
                      <div key={r.id} onClick={() => selectRecipient(r, r._type)}
                        style={{ padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${C.lineSoft || C.line}` }}
                        onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {r._type === "partner" ? <Building2 size={15} color="#D9892B" /> : <Users size={15} color={C.brand} />}
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{r._type === "partner" ? r.name : cleanName(r.name)}</div>
                          <div style={{ fontSize: 12, color: C.ink3 }}>{r._type === "partner" ? `Studio Partner · ${r.contact || ""}` : `Client · ${r.email || ""}`}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Selected recipient pill */}
                {emailPreview.recipient && (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 7, background: emailPreview.recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${emailPreview.recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 12px 4px 8px" }}>
                    {emailPreview.recipient._type === "partner" ? <Building2 size={12} color="#D9892B" /> : <Users size={12} color={C.brand} />}
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                      {emailPreview.recipient._type === "partner"
                        ? (emailPreview.recipient.contact || emailPreview.recipient.name)
                        : cleanName(emailPreview.recipient.name)}
                    </span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>{emailPreview.recipient._type === "partner" ? "Studio Partner" : "Client"}</span>
                    <button onClick={() => setEmailPreview(prev => ({ ...prev, recipient: null, recipientSearch: "" }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, marginLeft: 2, lineHeight: 1 }}>
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Manual fill — only vars that couldn't be auto-filled */}
              {emailPreview.recipient && manualVars.length > 0 && (
                <div style={{ background: "#F0F6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#2563EB", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fill in remaining variables</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px" }}>
                    {manualVars.map(k => (
                      <div key={k}>
                        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#3D2DA0", marginBottom: 3 }}>{`{{${k}}}`}</label>
                        <input
                          value={emailPreview.vars[k]}
                          onChange={e => setEmailPreview(prev => ({ ...prev, vars: { ...prev.vars, [k]: e.target.value } }))}
                          placeholder={k}
                          style={{ width: "100%", padding: "6px 9px", borderRadius: 7, border: `1px solid ${C.line}`, fontSize: 12.5, color: C.ink, background: "#fff", boxSizing: "border-box" }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Populated preview — editable */}
              {emailPreview.recipient && (
                <div>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Message — edit before sending</span>
                    {emailBodyOverride !== null && (
                      <button onClick={() => setEmailBodyOverride(null)} style={{ fontSize: 11, fontWeight: 600, color: C.brand, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        Reset to template
                      </button>
                    )}
                  </div>
                  {emailPopulatedSubject && (
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink2, marginBottom: 8, padding: "7px 12px", background: C.surfaceAlt, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      <span style={{ color: C.ink3 }}>Subject: </span>{emailPopulatedSubject}
                    </div>
                  )}
                  <textarea
                    value={emailBodyOverride ?? emailPopulatedBody}
                    onChange={e => setEmailBodyOverride(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: 13, color: C.ink, lineHeight: 1.7, background: C.surface, borderRadius: 10, padding: "14px 16px", border: `1px solid ${C.line}`, minHeight: 200, resize: "vertical", outline: "none", fontFamily: "inherit" }}
                  />
                </div>
              )}

              {/* No recipient yet — prompt */}
              {!emailPreview.recipient && !emailPreview.recipientSearch && (
                <div style={{ textAlign: "center", padding: "28px 0", color: C.ink3, fontSize: 13 }}>
                  <Users size={28} color={C.line} style={{ marginBottom: 10, display: "block", margin: "0 auto 10px" }} />
                  Search above to select a client or studio partner
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: "12px 20px", borderTop: `1px solid ${C.line}`, background: C.surfaceAlt }}>
              {emailError && (
                <div style={{ fontSize: 12.5, color: "#C0392B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> {emailError}
                </div>
              )}
              {!emailPreview.recipient?.email && emailPreview.recipient && (
                <div style={{ fontSize: 12.5, color: "#D9892B", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} /> This recipient has no email address on file — add one to their record first.
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { setEmailPreview(null); setEmailError(""); }} style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
                {emailPreview.recipient && (
                  <>
                    <button onClick={copyEmailText} style={{
                      padding: "8px 18px", borderRadius: 8, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: emailCopied ? hexA("#4A8C6F", 0.1) : "transparent", color: emailCopied ? "#4A8C6F" : C.ink2,
                      display: "flex", alignItems: "center", gap: 6, transition: "background .15s",
                    }}>
                      {emailCopied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                    <button onClick={sendEmail} disabled={emailSending || emailSent || !emailPreview.recipient?.email} style={{
                      padding: "8px 22px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: emailSending || emailSent || !emailPreview.recipient?.email ? "not-allowed" : "pointer",
                      background: emailSent ? "#4A8C6F" : emailSending ? C.ink3 : "#2563EB", color: "#fff",
                      display: "flex", alignItems: "center", gap: 6, transition: "background .15s", opacity: !emailPreview.recipient?.email ? 0.5 : 1,
                    }}>
                      {emailSent ? <><Check size={13} /> Sent!</> : emailSending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending…</> : <><Send size={13} /> Send Email</>}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template grid */}
      {filtered.length === 0 ? (
        <Empty pad>No templates match your filters.</Empty>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sb-grid2">
          {filtered.map(t => {
            const catColor = TMPL_CATEGORY_COLOR[t.category] || C.ink3;
            const chanColor = TMPL_CHANNEL_COLOR[t.channel] || C.ink3;
            const isCopied = copied === t.id;
            const vars = (t.variables || "").split(",").map(v => v.trim()).filter(Boolean);

            return (
              <div key={t.id} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12,
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>
                {/* Header */}
                <div style={{ padding: "12px 14px 10px", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13.5, color: C.ink, lineHeight: 1.3 }}>{t.name}</div>
                    </div>
                    <Tag color={chanColor} soft>{t.channel}</Tag>
                  </div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <Tag color={catColor} soft>{t.category}</Tag>
                    {t.usageCount > 0 && (
                      <span style={{ fontSize: 10.5, color: C.ink3, fontWeight: 500, padding: "2px 6px" }}>
                        Used {t.usageCount}×
                      </span>
                    )}
                  </div>
                </div>

                {/* Body preview */}
                <div style={{ padding: "10px 14px", flex: 1 }}>
                  {t.subject && (
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: C.ink3, marginBottom: 5 }}>
                      Subject: <span style={{ color: C.ink }}>{t.subject}</span>
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: C.ink2, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                    {renderWithVars(t.body)}
                  </div>
                </div>

                {/* Variables */}
                {vars.length > 0 && (
                  <div style={{ padding: "6px 14px 8px", display: "flex", gap: 4, flexWrap: "wrap", borderTop: `1px solid ${C.lineSoft || C.line}` }}>
                    {vars.map(v => (
                      <span key={v} style={{ fontSize: 10, background: "#EEEAFF", color: "#3D2DA0", borderRadius: 4, padding: "1px 6px", fontWeight: 600 }}>{v}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{ padding: "9px 12px", borderTop: `1px solid ${C.line}`, display: "flex", gap: 7, background: C.surfaceAlt }}>
                  <button onClick={() => copyTemplate(t)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer", fontWeight: 700,
                    fontSize: 12.5, border: "none",
                    background: isCopied ? "#4A8C6F" : C.brand,
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    transition: "background .15s",
                  }}>
                    {isCopied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> Copy</>}
                  </button>
                  <button onClick={() => openEmailPreview(t)} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, background: "#EBF3FF",
                    border: `1px solid #BFDBFE`, color: "#2563EB",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  }}>
                    <Mail size={12} /> Email
                  </button>
                  <button onClick={() => onOpen({ db: "templates", record: t })} style={{
                    flex: 1, padding: "7px 0", borderRadius: 8, cursor: "pointer",
                    fontSize: 12.5, fontWeight: 600, background: "transparent",
                    border: `1px solid ${C.line}`, color: C.ink2,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── TESTIMONIAL LIBRARY ── */
function TestimonialLibraryView({ data, onOpen }) {
  const testimonials = data.testimonials || [];
  const clients      = data.clients || [];

  const published    = testimonials.filter(t => t.status === "Published");
  const approved     = testimonials.filter(t => t.status === "Approved");
  const actionNeeded = testimonials.filter(t =>
    ["Breakthrough noted","Request sent"].includes(t.status)
  );
  const withVideo    = testimonials.filter(t => t.type === "Video" && t.status === "Published");
  const readyForWeb  = published.filter(t => t.useOnWebsite);
  const readyForSocial = published.filter(t => t.useOnSocial);

  const clientName = (id) => {
    const c = clients.find(x => x.id === id);
    return c ? cleanName(c.name) : "—";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Published"       value={published.length}       hint="approved + live" accent={C.brand} />
        <Stat label="Ready for web"   value={readyForWeb.length}     hint="permission confirmed" accent="#4A8C6F" />
        <Stat label="Ready for social"value={readyForSocial.length}  hint="approved to post" accent="#6B5CE7" />
        <Stat label="Action needed"   value={actionNeeded.length}    hint="request or follow-up" accent={actionNeeded.length ? C.gold : C.ink3} />
      </div>

      {/* Action needed banner */}
      {actionNeeded.length > 0 && (
        <div style={{ border: `1px solid #F5E4A8`, borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "11px 16px", background: "#FFFBF0", borderBottom: "1px solid #F5E4A8",
            display: "flex", alignItems: "center", gap: 8 }}>
            <BellRing size={14} color={C.gold} strokeWidth={1.5} />
            <span style={{ fontWeight: 700, fontSize: 13.5, color: "#7A4D0F" }}>
              {actionNeeded.length} testimonial{actionNeeded.length !== 1 ? "s" : ""} need attention
            </span>
          </div>
          {actionNeeded.map((t, i) => {
            const sv = t.status === "Breakthrough noted" ? "#D9892B" : "#5FB0F2";
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                background: "#fff", borderBottom: i < actionNeeded.length - 1 ? `1px solid ${C.line}` : "none",
                borderLeft: `3px solid ${sv}` }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{clientName(t.clientId)}</div>
                  <div style={{ fontSize: 11.5, color: C.ink3 }}>{t.notes || t.status}</div>
                </div>
                <Tag color={TESTIMONIAL_STATUS_COLOR[t.status]} soft>{t.status}</Tag>
                <button onClick={() => onOpen({ db: "testimonials", record: t })} style={{
                  fontSize: 11.5, fontWeight: 600, padding: "4px 12px", borderRadius: 7, cursor: "pointer",
                  background: C.brandSoft, color: C.brandDeep, border: `1px solid ${C.brand}40`,
                }}>View</button>
              </div>
            );
          })}
        </div>
      )}

      {/* Published quote cards */}
      {published.length > 0 && (
        <div>
          <h3 style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, margin: "0 0 12px" }}>
            Published Testimonials
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="sb-grid2">
            {published.map(t => {
              const themeColor = TESTIMONIAL_STATUS_COLOR["Published"];
              return (
                <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.line}`,
                  borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  {/* Colored top bar */}
                  <div style={{ height: 4, background: `linear-gradient(90deg, ${C.brand}, #6B5CE7)` }} />
                  <div style={{ padding: "14px 16px", flex: 1 }}>
                    {t.bestQuote ? (
                      <blockquote style={{ margin: 0, fontFamily: FONT.display, fontSize: 14.5, fontWeight: 500,
                        color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                        "{t.bestQuote}"
                      </blockquote>
                    ) : t.content ? (
                      <blockquote style={{ margin: 0, fontFamily: FONT.display, fontSize: 13.5, fontWeight: 400,
                        color: C.ink, lineHeight: 1.5, fontStyle: "italic" }}>
                        "{t.content.slice(0, 160)}{t.content.length > 160 ? "…" : ""}"
                      </blockquote>
                    ) : null}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.brandSoft,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: C.brand, flexShrink: 0 }}>
                        {(clientName(t.clientId) || "?")[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: C.ink }}>
                          {t.firstNameOnly ? clientName(t.clientId).split(" ")[0] : clientName(t.clientId)}
                        </div>
                        <div style={{ fontSize: 11, color: C.ink3 }}>{fmtDate(t.datePublished)}</div>
                      </div>
                    </div>
                    {t.themes?.length > 0 && (
                      <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
                        {t.themes.slice(0, 3).map(th => (
                          <span key={th} style={{ fontSize: 10.5, fontWeight: 600, padding: "2px 8px",
                            borderRadius: 20, background: C.surfaceAlt, color: C.ink2 }}>{th}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Permission chips + edit */}
                  <div style={{ padding: "10px 14px", borderTop: `1px solid ${C.line}`,
                    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {t.useOnWebsite && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#E2F0EA", color: "#1E5239" }}>Website ✓</span>}
                    {t.useOnSocial  && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#EEEAFF", color: "#3D2DA0" }}>Social ✓</span>}
                    {t.type === "Video" && <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FFF2F0", color: "#C0573F" }}>📹 Video</span>}
                    <div style={{ flex: 1 }} />
                    <button onClick={() => onOpen({ db: "testimonials", record: t })} style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                      background: "transparent", color: C.ink3, border: `1px solid ${C.line}`,
                    }}>Edit</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved not yet published */}
      {approved.length > 0 && (
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Approved — Ready to Publish</span>
            <span className="sb-badge">{approved.length}</span>
          </div>
          <div className="sb-panelbody">
            {approved.map(t => (
              <button key={t.id} className="sb-listrow" onClick={() => onOpen({ db: "testimonials", record: t })}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{clientName(t.clientId)}</div>
                  <div style={{ fontSize: 12, color: C.ink2, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    "{t.bestQuote || t.content?.slice(0, 100) || "—"}"
                  </div>
                  <div style={{ display: "flex", gap: 5, marginTop: 5 }}>
                    {t.themes?.slice(0, 2).map(th => <Tag key={th} soft>{th}</Tag>)}
                    {t.useOnWebsite && <Tag color="#4A8C6F" soft>Website OK</Tag>}
                    {t.useOnSocial  && <Tag color="#6B5CE7" soft>Social OK</Tag>}
                  </div>
                </div>
                <ChevronRight size={14} color={C.ink3} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ContentAnalyticsView({ data, onOpen }) {
  const posts    = data.content || [];
  const published = posts.filter(p => p.status === "Published");

  const totalReach   = published.reduce((a, p) => a + (Number(p.reach)    || 0), 0);
  const totalLeads   = published.reduce((a, p) => a + (Number(p.leads)    || 0), 0);
  const totalBooked  = published.reduce((a, p) => a + (Number(p.booked)   || 0), 0);
  const totalRev     = published.reduce((a, p) => a + (Number(p.revenue)  || 0), 0);
  const totalEngaged = published.reduce((a, p) => a + (Number(p.engagement)||0), 0);

  const convRate = totalLeads > 0 ? Math.round((totalBooked / totalLeads) * 100) : 0;
  const rpl      = totalLeads > 0 ? Math.round(totalRev / totalLeads) : 0;

  // Platform breakdown
  const platformMap = {};
  published.forEach(p => {
    const pl = p.platform || "Other";
    if (!platformMap[pl]) platformMap[pl] = { reach: 0, leads: 0, booked: 0, revenue: 0, count: 0 };
    platformMap[pl].reach   += Number(p.reach)   || 0;
    platformMap[pl].leads   += Number(p.leads)   || 0;
    platformMap[pl].booked  += Number(p.booked)  || 0;
    platformMap[pl].revenue += Number(p.revenue) || 0;
    platformMap[pl].count++;
  });
  const platforms = Object.entries(platformMap).sort((a, b) => b[1].revenue - a[1].revenue);

  // Category breakdown
  const catMap = {};
  published.forEach(p => {
    const cat = p.category || "Other";
    if (!catMap[cat]) catMap[cat] = { leads: 0, booked: 0, revenue: 0, count: 0 };
    catMap[cat].leads   += Number(p.leads)   || 0;
    catMap[cat].booked  += Number(p.booked)  || 0;
    catMap[cat].revenue += Number(p.revenue) || 0;
    catMap[cat].count++;
  });
  const categories = Object.entries(catMap).sort((a, b) => b[1].revenue - a[1].revenue);

  // Top posts by revenue
  const topPosts = [...published].sort((a, b) =>
    (Number(b.revenue) || 0) - (Number(a.revenue) || 0) ||
    (Number(b.leads)   || 0) - (Number(a.leads)   || 0)
  ).slice(0, 5);

  const maxRev = platforms[0]?.[1]?.revenue || 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Summary stats */}
      <div className="sb-stats">
        <Stat label="Total reach"        value={totalReach.toLocaleString()} hint={`${published.length} published posts`} />
        <Stat label="Leads generated"    value={totalLeads}    hint="across all platforms" accent={C.gold} />
        <Stat label="Sessions booked"    value={totalBooked}   hint={`${convRate}% lead conversion`} accent="#4A8C6F" />
        <Stat label="Revenue attributed" value={money(totalRev)} hint={`${money(rpl)} per lead`} accent={C.brand} />
      </div>

      {/* Content funnel */}
      <div className="sb-card">
        <div className="sb-panelhead">
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Content → Revenue Funnel</span>
        </div>
        <div style={{ padding: "8px 16px 16px", display: "flex", gap: 0, alignItems: "stretch" }}>
          {[
            { label: "Posts Published", value: published.length, color: "#9E9E9E",  pct: 100 },
            { label: "Total Reach",     value: totalReach,       color: "#5FB0F2",  pct: 100 },
            { label: "Leads",           value: totalLeads,        color: C.gold,    pct: published.length ? Math.min(100, Math.round((totalLeads / published.length) * 25)) : 0 },
            { label: "Bookings",        value: totalBooked,       color: C.brand,   pct: totalLeads ? Math.round((totalBooked / totalLeads) * 100) : 0 },
            { label: "Revenue",         value: money(totalRev),   color: "#4A8C6F", pct: totalBooked ? Math.min(100, Math.round((totalBooked / (totalBooked || 1)) * 100)) : 0 },
          ].map((step, i, arr) => (
            <div key={step.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ width: "90%", height: 8, background: hexA(step.color, 0.15), borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: step.pct + "%", background: step.color, borderRadius: 4 }} />
              </div>
              <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 700, color: step.color }}>{step.value}</div>
              <div style={{ fontSize: 11, color: C.ink3, textAlign: "center", fontWeight: 500 }}>{step.label}</div>
              {i < arr.length - 1 && (
                <div style={{ position: "absolute", fontSize: 16, color: C.line, marginTop: -8 }}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="sb-grid2">
        {/* Platform breakdown */}
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>By Platform</span>
          </div>
          <div style={{ padding: "0 4px 8px" }}>
            {platforms.length === 0 ? <Empty pad>No data yet.</Empty> : platforms.map(([pl, s]) => {
              const barW = Math.round((s.revenue / maxRev) * 100);
              const plColor = PLATFORM_COLOR[pl] || C.ink3;
              return (
                <div key={pl} style={{ padding: "8px 12px", borderBottom: `1px solid ${C.lineSoft || C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: plColor, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: 13, flex: 1 }}>{pl}</span>
                    <span style={{ fontSize: 11.5, color: C.ink3 }}>{s.count} post{s.count !== 1 ? "s" : ""}</span>
                    <span style={{ fontWeight: 700, fontSize: 13, color: plColor }}>{money(s.revenue)}</span>
                  </div>
                  <div style={{ height: 5, background: C.line, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: barW + "%", background: plColor, borderRadius: 3 }} />
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Reach: {(s.reach).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Leads: {s.leads}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>Booked: {s.booked}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category breakdown */}
        <div className="sb-card">
          <div className="sb-panelhead">
            <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>By Category</span>
          </div>
          <div style={{ padding: "0 4px 8px" }}>
            {categories.length === 0 ? <Empty pad>No data yet.</Empty> : categories.map(([cat, s]) => {
              const catColor = CONTENT_CAT_COLOR[cat] || C.ink3;
              const maxCatRev = categories[0]?.[1]?.revenue || 1;
              return (
                <div key={cat} style={{ padding: "7px 12px", borderBottom: `1px solid ${C.lineSoft || C.line}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, flex: 1, color: C.ink }}>{cat}</span>
                    <span style={{ fontSize: 11, color: C.ink3 }}>{s.count}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: catColor }}>{money(s.revenue)}</span>
                  </div>
                  <div style={{ height: 4, background: C.line, borderRadius: 3, marginTop: 5, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.round((s.revenue / maxCatRev) * 100) + "%", background: catColor, borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top posts */}
      <div className="sb-card">
        <div className="sb-panelhead">
          <span style={{ fontFamily: FONT.display, fontSize: 15, fontWeight: 600 }}>Top Performing Posts</span>
        </div>
        <div className="sb-panelbody">
          {topPosts.length === 0 ? <Empty pad>No published posts yet.</Empty> : topPosts.map((p, i) => {
            const catColor = CONTENT_CAT_COLOR[p.category] || C.ink3;
            const plColor  = PLATFORM_COLOR[p.platform]   || C.ink3;
            return (
              <button key={p.id} className="sb-listrow" onClick={() => onOpen({ db: "content", record: p })}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: C.brandSoft, color: C.brand,
                  fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, lineHeight: 1.3 }}>{p.name.replace("", "")}</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                    <Tag color={catColor} soft>{p.category}</Tag>
                    <Tag color={plColor} soft>{p.platform}</Tag>
                    {p.partnerId && <Tag color={LANE.b2b.color} soft>Partner tagged</Tag>}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 13.5, color: C.brand }}>{money(p.revenue)}</span>
                  <span style={{ fontSize: 11, color: C.ink3 }}>{p.leads} leads · {p.booked} booked</span>
                  <span style={{ fontSize: 11, color: C.ink3 }}>Reach: {(Number(p.reach) || 0).toLocaleString()}</span>
                </div>
                <ChevronRight size={13} color={C.ink3} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ReferralTreeView({ data, derived, today, onOpen }) {
  const refs = data.referrals || [];
  const clients = data.clients || [];

  // ── Build per-referrer stats ─────────────────────────────────
  const byReferrer = {};
  refs.forEach(r => {
    if (!r.referrerId) return;
    if (!byReferrer[r.referrerId]) byReferrer[r.referrerId] = { refs: [], totalRev: 0, attended: 0, purchased: 0, actionNeeded: 0 };
    const b = byReferrer[r.referrerId];
    b.refs.push(r);
    b.totalRev += Number(r.revenue) || 0;
    if (["Attended", "Purchased"].includes(r.status)) b.attended++;
    if (r.status === "Purchased") b.purchased++;
    if (!r.thankYouSent || r.status === "Referred") b.actionNeeded++;
  });

  const sorted = Object.entries(byReferrer)
    .sort(([, a], [, b]) => b.totalRev - a.totalRev || b.refs.length - a.refs.length);

  // ── Top-level stats ──────────────────────────────────────────
  const totalRev    = refs.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const totalPurch  = refs.filter(r => r.status === "Purchased").length;
  const totalRefs   = refs.length;
  const convRate    = totalRefs > 0 ? Math.round((totalPurch / totalRefs) * 100) : 0;
  const needAction  = refs.filter(r => !r.thankYouSent || r.status === "Referred").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Stats */}
      <div className="sb-stats">
        <Stat label="Referral revenue"  value={money(totalRev)}   accent={C.brand} hint="total from all referrals" />
        <Stat label="Conversion rate"   value={convRate + "%"}    accent={convRate >= 50 ? "#4A8C6F" : C.gold} hint={`${totalPurch} purchased of ${totalRefs}`} />
        <Stat label="Active referrers"  value={sorted.length}     hint="clients who have referred" />
        <Stat label="Action needed"     value={needAction}        accent={needAction > 0 ? "#D9892B" : C.ink3} hint="thank-you or follow-up" />
      </div>

      {/* Action needed banner */}
      {needAction > 0 && (
        <div style={{ background: hexA("#D9892B", 0.09), border: `1px solid ${hexA("#D9892B", 0.3)}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 13, color: "#7A4D0F", fontWeight: 600 }}>
            {needAction} referral{needAction !== 1 ? "s" : ""} need attention — thank you note sent or follow-up pending
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "#D9892B" }}>Check "Action needed" view →</span>
        </div>
      )}

      {/* Tree */}
      {!sorted.length ? (
        <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
          <Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No referrals yet</div>
          <div style={{ fontSize: 13 }}>Add a referral when a client introduces someone to your work.</div>
        </div>
      ) : sorted.map(([refId, stats]) => {
        const referrer = clients.find(c => c.id === refId);
        const convPct  = stats.refs.length > 0 ? Math.round((stats.purchased / stats.refs.length) * 100) : 0;
        return (
          <div key={refId} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, overflow: "hidden" }}>
            {/* Referrer header */}
            <div style={{ padding: "14px 16px", background: hexA(C.brand, 0.04), borderBottom: `1px solid ${C.line}`, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.brand, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {(referrer?.name || "?").replace(/^Sample - /, "").trim()[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{(referrer?.name || refId).replace(/^Sample - /, "").trim()}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>
                  {stats.refs.length} referral{stats.refs.length !== 1 ? "s" : ""} · {stats.attended} attended · {stats.purchased} purchased
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: stats.totalRev > 0 ? "#4A8C6F" : C.ink3 }}>{money(stats.totalRev)}</div>
                <div style={{ fontSize: 11, color: C.ink3 }}>referral revenue</div>
              </div>
              {stats.totalRev >= 300 && (
                <Tag color="#4A8C6F" soft>Advocate ⭐</Tag>
              )}
            </div>

            {/* Referral branches */}
            <div style={{ padding: "8px 0" }}>
              {stats.refs.map((r, i) => {
                const refClient = r.referredId ? clients.find(c => c.id === r.referredId) : null;
                const isLast = i === stats.refs.length - 1;
                return (
                  <div key={r.id} style={{ display: "flex", alignItems: "flex-start", padding: "10px 16px", gap: 0, borderBottom: isLast ? "none" : `1px solid ${C.lineSoft}` }}>
                    {/* Tree connector */}
                    <div style={{ width: 36, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 3, flexShrink: 0 }}>
                      <div style={{ width: 1, height: 10, background: C.line }} />
                      <div style={{ width: 16, height: 1, background: C.line }} />
                    </div>
                    {/* Branch content */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ flex: 1, minWidth: 140 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{cleanName(r.referredName)}</span>
                        {refClient && <span style={{ fontSize: 11, color: C.ink3, marginLeft: 6 }}>in system</span>}
                      </div>
                      <Tag color={REF_STATUS_COLOR[r.status]}>{r.status}</Tag>
                      {r.revenue > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#4A8C6F" }}>{money(r.revenue)}</span>}
                      <span style={{ fontSize: 11, color: C.ink3 }}>{fmtDate(r.date)}</span>
                      {!r.thankYouSent && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#D9892B", background: hexA("#D9892B", 0.1), padding: "2px 7px", borderRadius: 20 }}>Thank-you needed</span>
                      )}
                      {r.notes && <span style={{ fontSize: 11, color: C.ink3, fontStyle: "italic" }}>{r.notes}</span>}
                    </div>
                    <button onClick={() => onOpen(r)} style={{ padding: "4px 10px", fontSize: 11, background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, cursor: "pointer", color: C.ink2, flexShrink: 0 }}>Edit</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   REVENUE ATTRIBUTION VIEW
   ============================================================ */

function RevenueAttributionView({ data, derived, today, onOpen }) {
  const rows = data.revenue || [];
  const [highlight, setHighlight] = useState(null);

  // ── Core totals ─────────────────────────────────────────────
  const totalGross = sum(rows, "gross");
  const totalFees  = sum(rows, "stripeFee") + sum(rows, "facilitatorCost");
  const totalSplit = sum(rows, "studioSplit");
  const totalRef   = sum(rows, "refunds");
  const totalNet   = rows.reduce((a, r) => a + calcNet(r), 0);
  const margin     = totalGross > 0 ? Math.round((totalNet / totalGross) * 100) : 0;

  // ── By channel ──────────────────────────────────────────────
  const byChannel = {};
  rows.forEach(r => {
    const ch = r.channel || "Unknown";
    if (!byChannel[ch]) byChannel[ch] = { gross: 0, fees: 0, split: 0, facilitator: 0, refunds: 0, net: 0, count: 0 };
    byChannel[ch].gross       += Number(r.gross || 0);
    byChannel[ch].fees        += Number(r.stripeFee || 0);
    byChannel[ch].split       += Number(r.studioSplit || 0);
    byChannel[ch].facilitator += Number(r.facilitatorCost || 0);
    byChannel[ch].refunds     += Number(r.refunds || 0);
    byChannel[ch].net         += calcNet(r);
    byChannel[ch].count++;
  });
  const channelRows = Object.entries(byChannel)
    .map(([ch, d]) => ({ ch, ...d, margin: d.gross > 0 ? Math.round((d.net / d.gross) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // ── By source ────────────────────────────────────────────────
  const bySrc = {};
  rows.forEach(r => {
    const s = r.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { gross: 0, net: 0, count: 0 };
    bySrc[s].gross += Number(r.gross || 0);
    bySrc[s].net   += calcNet(r);
    bySrc[s].count++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([src, d]) => ({ src, ...d, margin: d.gross > 0 ? Math.round((d.net / d.gross) * 100) : 0 }))
    .sort((a, b) => b.net - a.net);

  // ── By client ────────────────────────────────────────────────
  const byClient = {};
  rows.filter(r => r.clientId).forEach(r => {
    if (!byClient[r.clientId]) byClient[r.clientId] = { gross: 0, net: 0, count: 0 };
    byClient[r.clientId].gross += Number(r.gross || 0);
    byClient[r.clientId].net   += calcNet(r);
    byClient[r.clientId].count++;
  });
  const clientRows = Object.entries(byClient)
    .map(([id, d]) => ({ id, name: derived.clientName[id] || id, ...d }))
    .sort((a, b) => b.net - a.net).slice(0, 8);

  // ── Recent transactions ──────────────────────────────────────
  const recent = [...rows].sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 6);

  const marginColor = (m) => m >= 70 ? "#4A8C6F" : m >= 45 ? C.gold : "#C0573F";
  const thS = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdS = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };
  const tdR = { ...tdS, textAlign: "right" };

  const marginBar = (m, maxM) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: C.line, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ height: "100%", width: Math.max(0, m) + "%", background: marginColor(m), borderRadius: 6, transition: "width .4s" }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: marginColor(m), width: 36, textAlign: "right" }}>{m}%</span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Net revenue"   value={money(totalNet)}   accent={C.brand} hint="after all deductions" />
        <Stat label="Gross revenue" value={money(totalGross)} accent="#2F6FD0" hint="before fees & splits" />
        <Stat label="Margin"        value={margin + "%"}      accent={marginColor(margin)} hint="net ÷ gross" />
        <Stat label="Studio splits" value={money(totalSplit)} accent={C.gold} hint="paid to partner studios" />
      </div>

      {/* Revenue waterfall: Gross → deductions → Net */}
      <Panel title="Revenue waterfall">
        <div style={{ padding: "4px 0 8px" }}>
          {[
            { label: "Gross revenue",      value: totalGross, color: "#2F6FD0", op: "base" },
            { label: "Studio splits",      value: -totalSplit,  color: C.gold,    op: "minus" },
            { label: "Processing fees",    value: -totalFees,   color: "#9FB2CC", op: "minus" },
            { label: "Refunds",            value: -totalRef,    color: "#C0573F", op: "minus" },
            { label: "Net revenue",        value: totalNet,   color: "#4A8C6F", op: "result" },
          ].map(({ label, value, color, op }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "7px 0", borderBottom: op === "result" ? "none" : `1px solid ${C.lineSoft}` }}>
              <div style={{ width: 180, fontSize: op === "result" ? 13.5 : 13, fontWeight: op === "result" ? 700 : 500, color: op === "result" ? color : C.ink2 }}>{label}</div>
              <div style={{ flex: 1, height: op === "result" ? 10 : 7, background: C.line, borderRadius: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: Math.abs(totalGross) > 0 ? Math.abs(value) / totalGross * 100 + "%" : "0%", background: color, borderRadius: 6 }} />
              </div>
              <div style={{ width: 90, textAlign: "right", fontSize: op === "result" ? 15 : 13, fontWeight: op === "result" ? 700 : 500, color: color }}>
                {op === "minus" ? `-${money(Math.abs(value))}` : money(value)}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Channel P&L table */}
      <Panel title="P&L by channel — what's actually profitable">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thS}>Channel</th>
              <th style={{ ...thS, textAlign: "right" }}>Txns</th>
              <th style={{ ...thS, textAlign: "right" }}>Gross</th>
              <th style={{ ...thS, textAlign: "right" }}>Studio split</th>
              <th style={{ ...thS, textAlign: "right" }}>Fees</th>
              <th style={{ ...thS, textAlign: "right" }}>Net</th>
              <th style={{ ...thS, minWidth: 120 }}>Margin</th>
            </tr>
          </thead>
          <tbody>
            {channelRows.map(r => (
              <tr key={r.ch}
                onMouseEnter={() => setHighlight(r.ch)} onMouseLeave={() => setHighlight(null)}
                style={{ background: highlight === r.ch ? C.surfaceAlt : "transparent", cursor: "default" }}>
                <td style={{ ...tdS }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: REV_CHANNEL_COLOR[r.ch] || C.ink3, flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{r.ch}</span>
                  </div>
                </td>
                <td style={tdR}>{r.count}</td>
                <td style={tdR}>{money(r.gross)}</td>
                <td style={{ ...tdR, color: r.split > 0 ? C.gold : C.ink3 }}>{r.split > 0 ? money(r.split) : "—"}</td>
                <td style={{ ...tdR, color: C.ink2 }}>{r.fees > 0 ? money(r.fees + r.facilitator) : "—"}</td>
                <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                <td style={{ ...tdS, minWidth: 130 }}>{marginBar(r.margin)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: C.surfaceAlt }}>
              <td style={{ ...tdS, fontWeight: 700 }}>Total</td>
              <td style={tdR}>{rows.length}</td>
              <td style={{ ...tdR, fontWeight: 700 }}>{money(totalGross)}</td>
              <td style={{ ...tdR, color: C.gold, fontWeight: 600 }}>{money(totalSplit)}</td>
              <td style={{ ...tdR, color: C.ink2 }}>{money(totalFees)}</td>
              <td style={{ ...tdR, fontWeight: 700, color: marginColor(margin) }}>{money(totalNet)}</td>
              <td style={{ ...tdS }}>{marginBar(margin)}</td>
            </tr>
          </tfoot>
        </table>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By source */}
        <Panel title="Net revenue by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thS}>Source</th>
                <th style={{ ...thS, textAlign: "right" }}>Gross</th>
                <th style={{ ...thS, textAlign: "right" }}>Net</th>
                <th style={{ ...thS, minWidth: 90 }}>Margin</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.src}>
                  <td style={tdS}><Tag color={SOURCE_COLOR[r.src] || C.ink3} soft>{r.src}</Tag></td>
                  <td style={tdR}>{money(r.gross)}</td>
                  <td style={{ ...tdR, fontWeight: 700, color: marginColor(r.margin) }}>{money(r.net)}</td>
                  <td style={{ ...tdS, minWidth: 100 }}>{marginBar(r.margin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By client */}
        <Panel title="Top clients by net revenue">
          {!clientRows.length ? <Empty>No client-linked transactions yet</Empty> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clientRows.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i === 0 ? hexA(C.brand, 0.06) : "transparent" }}>
                  <span style={{ width: 20, fontSize: 12, fontWeight: 700, color: C.ink3, textAlign: "right" }}>{i + 1}</span>
                  <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{(r.name || "—").trim()}</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(r.net)}</div>
                    <div style={{ fontSize: 11, color: C.ink3 }}>{r.count} txn{r.count !== 1 ? "s" : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent transactions */}
      <Panel title="Recent transactions">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thS}>Description</th>
              <th style={thS}>Date</th>
              <th style={thS}>Channel</th>
              <th style={{ ...thS, textAlign: "right" }}>Gross</th>
              <th style={{ ...thS, textAlign: "right" }}>Net</th>
              <th style={thS}>Source</th>
            </tr>
          </thead>
          <tbody>
            {recent.map(r => (
              <tr key={r.id} onClick={() => onOpen(r)} style={{ cursor: "pointer" }} className="sb-trow">
                <td style={{ ...tdS, fontWeight: 600, maxWidth: 200 }}>{cleanName(r.name)}</td>
                <td style={tdS}>{fmtDate(r.date)}</td>
                <td style={tdS}><Tag color={REV_CHANNEL_COLOR[r.channel] || C.ink3} soft>{r.channel}</Tag></td>
                <td style={tdR}>{money(r.gross)}</td>
                <td style={{ ...tdR, fontWeight: 700, color: marginColor(calcNet(r) > 0 ? Math.round(calcNet(r) / Math.max(r.gross, 1) * 100) : 0) }}>{money(calcNet(r))}</td>
                <td style={tdS}>{r.source ? <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

/* ============================================================
   OFFER CONVERSION ANALYTICS
   ============================================================ */

function OfferConversionView({ data, derived, today, onOpen }) {
  const offers = data.offers || [];

  // ── Core metrics ────────────────────────────────────────────
  const won    = offers.filter(o => WON_STATUSES.includes(o.status));
  const lost   = offers.filter(o => LOST_STATUSES.includes(o.status));
  const open   = offers.filter(o => OPEN_STATUSES.includes(o.status));
  const closed = won.length + lost.length;
  const convRate  = closed > 0 ? Math.round((won.length / closed) * 100) : 0;
  const wonRev    = sum(won, "price");
  const pipeline  = sum(open, "price");
  const avgDeal   = won.length > 0 ? wonRev / won.length : 0;

  // ── Pipeline stage bar ──────────────────────────────────────
  const stageCount = {};
  OFFER_STATUS.forEach(s => { stageCount[s] = offers.filter(o => o.status === s).length; });
  const maxStage = Math.max(1, ...Object.values(stageCount));

  // ── By offer type ───────────────────────────────────────────
  const byType = {};
  offers.forEach(o => {
    const t = o.offerType || "Unknown";
    if (!byType[t]) byType[t] = { sent: 0, won: 0, lost: 0, rev: 0 };
    byType[t].sent++;
    if (WON_STATUSES.includes(o.status))  { byType[t].won++; byType[t].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) byType[t].lost++;
  });
  const typeRows = Object.entries(byType)
    .map(([type, d]) => ({ type, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── By source ───────────────────────────────────────────────
  const bySrc = {};
  offers.forEach(o => {
    const s = o.source || "Unknown";
    if (!bySrc[s]) bySrc[s] = { sent: 0, won: 0, lost: 0, rev: 0 };
    bySrc[s].sent++;
    if (WON_STATUSES.includes(o.status))  { bySrc[s].won++; bySrc[s].rev += Number(o.price) || 0; }
    if (LOST_STATUSES.includes(o.status)) bySrc[s].lost++;
  });
  const srcRows = Object.entries(bySrc)
    .map(([source, d]) => ({ source, ...d, rate: (d.won + d.lost) > 0 ? Math.round((d.won / (d.won + d.lost)) * 100) : null }))
    .sort((a, b) => b.rev - a.rev);

  // ── Recent wins & losses ─────────────────────────────────────
  const recentWon  = [...won].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);
  const recentLost = [...lost].sort((a, b) => (b.dateOffered || "").localeCompare(a.dateOffered || "")).slice(0, 5);

  const rateColor = (r) => r === null ? C.ink3 : r >= 60 ? "#4A8C6F" : r >= 35 ? C.gold : "#C0573F";

  const convBar = (won, total) => {
    const p = total > 0 ? Math.round((won / total) * 100) : 0;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: C.line, borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: p + "%", background: rateColor(p), borderRadius: 6 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: rateColor(p), width: 32 }}>{p}%</span>
      </div>
    );
  };

  const thStyle = { fontSize: 11.5, textTransform: "uppercase", letterSpacing: ".06em", color: C.ink3, fontWeight: 600, padding: "10px 12px", borderBottom: `1px solid ${C.line}`, textAlign: "left", whiteSpace: "nowrap" };
  const tdStyle = { padding: "11px 12px", borderBottom: `1px solid ${C.lineSoft}`, fontSize: 13 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      {/* Key metrics */}
      <div className="sb-stats">
        <Stat label="Conversion rate" value={convRate + "%"} accent={rateColor(convRate)} hint={`${won.length} won of ${closed} closed`} />
        <Stat label="Won revenue"     value={money(wonRev)}  accent={C.brand} hint="accepted + paid" />
        <Stat label="Open pipeline"   value={money(pipeline)} hint={`${open.length} open offer${open.length !== 1 ? "s" : ""}`} />
        <Stat label="Avg deal size"   value={money(avgDeal)}  hint="per closed offer" />
      </div>

      {/* Pipeline stage breakdown */}
      <Panel title="Pipeline by status">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 0" }}>
          {OFFER_STATUS.map(s => {
            const n = stageCount[s] || 0;
            if (!n) return null;
            return (
              <div key={s} style={{ flex: 1, minWidth: 90, background: C.surfaceAlt, borderRadius: 10, padding: "12px 14px", borderTop: `3px solid ${OFFER_STATUS_COLOR[s]}` }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: OFFER_STATUS_COLOR[s] }}>{n}</div>
                <div style={{ fontSize: 11, color: C.ink2, fontWeight: 600, marginTop: 3 }}>{s}</div>
                <div style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>
                  {money(sum(offers.filter(o => o.status === s), "price"))}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        {/* By offer type */}
        <Panel title="Conversion by offer type">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Type</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {typeRows.map(r => (
                <tr key={r.type}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{r.type}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* By source */}
        <Panel title="Conversion by source">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Source</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Sent</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Won</th>
                <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                <th style={{ ...thStyle, minWidth: 100 }}>Conv. rate</th>
              </tr>
            </thead>
            <tbody>
              {srcRows.map(r => (
                <tr key={r.source}>
                  <td style={{ ...tdStyle }}>
                    <Tag color={SOURCE_COLOR[r.source] || C.ink3} soft>{r.source}</Tag>
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: C.ink2 }}>{r.sent}</td>
                  <td style={{ ...tdStyle, textAlign: "right", color: "#4A8C6F", fontWeight: 600 }}>{r.won}</td>
                  <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{money(r.rev)}</td>
                  <td style={{ ...tdStyle, minWidth: 110 }}>{convBar(r.won, r.won + r.lost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {/* Follow-up due warning */}
      {(() => {
        const fu = offers.filter(o => o.status === "Follow-up due" || (OPEN_STATUSES.includes(o.status) && o.followUpDate && o.followUpDate <= today));
        if (!fu.length) return null;
        return (
          <Panel title={`Follow-up needed · ${fu.length}`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {fu.slice(0, 8).map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", background: hexA("#D9892B", 0.07), borderRadius: 8, cursor: "pointer", borderLeft: `3px solid #D9892B` }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</span>
                    <span style={{ fontSize: 12, color: C.ink2, marginLeft: 8 }}>{o.offerType} · {money(o.price)}</span>
                  </div>
                  <Tag color={OFFER_STATUS_COLOR[o.status]}>{o.status}</Tag>
                  {o.followUpDate && <DateChip iso={o.followUpDate} today={today} />}
                </div>
              ))}
            </div>
          </Panel>
        );
      })()}

      {/* Recent wins & losses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="sb-grid2">
        <Panel title={`Recent wins · ${won.length}`}>
          {!recentWon.length ? <Empty>No closed offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentWon.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#4A8C6F", 0.06), borderLeft: "3px solid #4A8C6F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  <span style={{ fontWeight: 700, color: "#4A8C6F", fontSize: 13 }}>{money(o.price)}</span>
                </div>
              ))}
            </div>
          }
        </Panel>
        <Panel title={`Recent losses · ${lost.length}`}>
          {!recentLost.length ? <Empty>No lost offers yet</Empty> :
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {recentLost.map(o => (
                <div key={o.id} onClick={() => onOpen(o)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 10px", borderRadius: 8, cursor: "pointer", background: hexA("#C0573F", 0.05), borderLeft: "3px solid #C0573F" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{clientShort(derived.clientName[o.clientId] || cleanName(o.name))}</div>
                    <div style={{ fontSize: 11, color: C.ink2 }}>{o.offerType} · {fmtDate(o.dateOffered)}</div>
                  </div>
                  {o.reasonLost && <span style={{ fontSize: 11, color: "#C0573F", maxWidth: 120, textAlign: "right" }}>{o.reasonLost}</span>}
                </div>
              ))}
            </div>
          }
        </Panel>
      </div>
    </div>
  );
}

/* ============================================================
   FOLLOW-UP ENGINE COMPONENTS
   ============================================================ */

function FollowUpEngine({ data, setData, today, onOpen, canEdit = true }) {
  const [tab, setTab] = useState("queue");

  const sequences = data.sequences || [];

  // Build all pending steps across all active sequences
  const allItems = [];
  sequences.forEach(seq => {
    if (seq.status !== "active") return;
    const client = (data.clients || []).find(c => c.id === seq.clientId);
    if (!client) return;
    seq.steps.forEach(step => {
      if (step.sent) return;
      const stepDef = FU_STEPS.find(s => s.id === step.stepId);
      allItems.push({ seqId: seq.id, seq, clientId: seq.clientId, client, stepId: step.stepId, stepDef, dueDate: step.dueDate, sessionDate: seq.sessionDate, sessionName: seq.sessionName });
    });
  });
  allItems.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const overdueItems  = allItems.filter(i => i.dueDate < today);
  const todayItems    = allItems.filter(i => i.dueDate === today);
  const upcomingItems = allItems.filter(i => i.dueDate > today);
  const totalDue      = overdueItems.length + todayItems.length;

  const markSent = (seqId, stepId) => {
    if (!canEdit) return;
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq => {
        if (seq.id !== seqId) return seq;
        const steps = seq.steps.map(s => s.stepId !== stepId ? s : { ...s, sent: true, sentAt: today });
        const status = steps.every(s => s.sent) ? "completed" : "active";
        return { ...seq, steps, status };
      }),
    }));
  };

  const togglePause = (seqId) => {
    if (!canEdit) return;
    setData(d => ({
      ...d,
      sequences: (d.sequences || []).map(seq =>
        seq.id !== seqId ? seq : { ...seq, status: seq.status === "paused" ? "active" : "paused" }
      ),
    }));
  };

  const tabStyle = (t) => ({
    padding: "8px 16px", border: "none", borderRadius: "8px 8px 0 0", fontSize: 13, fontWeight: 600,
    cursor: "pointer", background: tab === t ? C.brand : "transparent",
    color: tab === t ? "#fff" : C.ink3, display: "flex", alignItems: "center", gap: 6,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Stats row */}
      <div className="sb-stats">
        <Stat label="Due / Overdue" value={totalDue} accent={totalDue > 0 ? "#C0573F" : C.brand} hint="need action now" />
        <Stat label="Coming up" value={upcomingItems.length} hint="within 21 days" />
        <Stat label="Active sequences" value={sequences.filter(s => s.status === "active").length} hint="clients in nurture" />
        <Stat label="Completed" value={sequences.filter(s => s.status === "completed").length} hint="full sequences sent" />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: `2px solid ${C.line}` }}>
        <button style={tabStyle("queue")} onClick={() => setTab("queue")}>
          Message Queue
          {totalDue > 0 && <span style={{ background: "#C0573F", color: "#fff", borderRadius: 20, fontSize: 11, fontWeight: 700, padding: "1px 7px" }}>{totalDue}</span>}
        </button>
        <button style={tabStyle("sequences")} onClick={() => setTab("sequences")}>Active Sequences</button>
        <button style={tabStyle("templates")} onClick={() => setTab("templates")}>Message Templates</button>
      </div>

      {tab === "queue" && (
        <MessageQueue
          overdue={overdueItems} todayItems={todayItems} upcoming={upcomingItems}
          today={today} markSent={markSent}
          data={data} setData={setData}
          onOpenClient={(clientId) => {
            const c = (data.clients || []).find(x => x.id === clientId);
            if (c) onOpen({ db: "clients", record: c });
          }}
        />
      )}
      {tab === "sequences" && (
        <SequencesView sequences={sequences} clients={data.clients || []} today={today} onOpen={onOpen} togglePause={togglePause} />
      )}
      {tab === "templates" && <TemplatesView data={data} setData={setData} />}
    </div>
  );
}

function MessageQueue({ overdue, todayItems, upcoming, today, markSent, onOpenClient, data, setData }) {
  const [copied, setCopied]   = useState(null);
  const [expanded, setExpanded] = useState({});
  const [composing, setComposing] = useState(null); // key of item being composed
  const [emailState, setEmailState] = useState({}); // { [key]: { subject, body, sending, sent, error } }

  const emailTemplates = (data?.templates || []).filter(t => (t.channel || "").toLowerCase() === "email");

  const populateForClient = (tmplBody, tmplSubject, client, item) => {
    const fullName  = (client?.name || "there").trim();
    const firstName = fullName.split(" ")[0];
    const replace   = (str) => (str || "")
      .replace(/\{\{ClientName\}\}/gi, fullName)
      .replace(/\{\{FirstName\}\}/gi, firstName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, fullName)
      .replace(/\{\{Email\}\}/gi, client?.email || "")
      .replace(/\{\{Phone\}\}/gi, client?.phone || "")
      .replace(/\{first_name\}/g, firstName)
      .replace(/\{name\}/g, fullName)
      .replace(/\{session_name\}/g, item?.sessionName || "our session")
      .replace(/\{session_date\}/g, item?.sessionDate ? fmtDate(item.sessionDate) : "");
    return { body: replace(tmplBody), subject: replace(tmplSubject) };
  };

  const startCompose = (key, item, defaultBody) => {
    const subject = `Follow-up: ${item.sessionName || "your session"}`;
    setEmailState(s => ({ ...s, [key]: { subject, body: defaultBody, selectedTemplateId: "__followup__", sending: false, sent: false, error: "" } }));
    setComposing(key);
    setExpanded(e => ({ ...e, [key]: true }));
  };

  const applyTemplate = (key, tmplId, item) => {
    if (tmplId === "__followup__") {
      const msg = interpolateTemplate(FU_TEMPLATES[item.stepId], item.client, item);
      setEmailState(s => ({ ...s, [key]: { ...s[key], selectedTemplateId: tmplId, subject: `Follow-up: ${item.sessionName || "your session"}`, body: msg } }));
    } else {
      const tmpl = emailTemplates.find(t => t.id === tmplId);
      if (!tmpl) return;
      const { body, subject } = populateForClient(tmpl.body, tmpl.subject, item.client, item);
      setEmailState(s => ({ ...s, [key]: { ...s[key], selectedTemplateId: tmplId, subject, body } }));
    }
  };

  const sendFollowUpEmail = async (key, item) => {
    const state = emailState[key];
    if (!state || !item.client?.email) return;
    setEmailState(s => ({ ...s, [key]: { ...s[key], sending: true, error: "" } }));
    try {
      const secret = import.meta.env.VITE_FRONTEND_SECRET || "";
      const res  = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-frontend-secret": secret },
        body: JSON.stringify({
          to:            item.client.email,
          recipientName: (item.client.name || "").split(" ")[0],
          subject:       state.subject,
          body:          state.body,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed.");

      // Write to global email log
      const selectedTmpl = eState.selectedTemplateId && eState.selectedTemplateId !== "__followup__"
        ? emailTemplates.find(t => t.id === eState.selectedTemplateId) : null;
      const logEntry = {
        id:            `em_${Date.now()}`,
        date:          new Date().toISOString(),
        templateId:    selectedTmpl?.id || item.stepId,
        templateName:  selectedTmpl?.name || item.stepDef?.label || item.stepId,
        category:      selectedTmpl?.category || "Follow-Up",
        to:            item.client.email,
        recipientName: cleanName(item.client.name || ""),
        recipientType: "client",
        subject:       state.subject,
        body:          state.body,
        resendId:      json.id || null,
        sendStatus:    "sent",
      };
      setData(d => ({
        ...d,
        emailLog: [...(d.emailLog || []), logEntry],
        clients: (d.clients || []).map(c =>
          c.id === item.clientId ? { ...c, emailHistory: [...(c.emailHistory || []), logEntry] } : c
        ),
      }));

      setEmailState(s => ({ ...s, [key]: { ...s[key], sending: false, sent: true } }));
      markSent(item.seqId, item.stepId);
      setTimeout(() => { setComposing(null); setExpanded(e => ({ ...e, [key]: false })); }, 1500);
    } catch (err) {
      setEmailState(s => ({ ...s, [key]: { ...s[key], sending: false, error: err.message || "Send failed." } }));
    }
  };

  const copyMsg = (key, text) => {
    try { navigator.clipboard.writeText(text); } catch (e) {}
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const toggle = (key) => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const renderGroup = (items, label, dotColor) => {
    if (!items.length) return null;
    return (
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: dotColor, marginBottom: 10 }}>
          {label} · {items.length}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map(item => {
            const key        = `${item.seqId}_${item.stepId}`;
            const isOpen     = expanded[key];
            const isEmail    = item.stepDef?.channel === "email";
            const isComposing = composing === key;
            const eState     = emailState[key] || {};
            const msg        = interpolateTemplate(FU_TEMPLATES[item.stepId], item.client, item);
            const wasCopied  = copied === key;
            const daysAgo    = Math.round((new Date(today) - new Date(item.sessionDate)) / 86400000);
            return (
              <div key={key} style={{
                background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${item.stepDef?.accent || C.brand}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{ padding: "12px 14px" }}>
                  {/* Header row */}
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: isOpen || isComposing ? 10 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => onOpenClient(item.clientId)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 700, fontSize: 14, color: C.ink, textDecoration: "underline" }}>
                          {(item.client?.name || "—").trim()}
                        </button>
                        <Tag color={item.stepDef?.accent || C.brand} soft>{item.stepDef?.label}</Tag>
                        <MiniChip color={item.stepDef?.accent}>
                          {isEmail ? "Email" : "Text"}
                        </MiniChip>
                      </div>
                      <div style={{ fontSize: 12, color: C.ink3, marginTop: 3 }}>
                        {item.sessionName} · {daysAgo} day{daysAgo !== 1 ? "s" : ""} ago ·{" "}
                        {item.dueDate < today ? <span style={{ color: "#C0573F", fontWeight: 600 }}>overdue since {fmtDate(item.dueDate)}</span>
                          : <span style={{ color: "#D9892B", fontWeight: 600 }}>due today</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      {!isComposing && (
                        <button onClick={() => toggle(key)} style={{ padding: "5px 11px", background: C.surfaceAlt, border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12, cursor: "pointer", color: C.ink2 }}>
                          {isOpen ? "Hide" : "View"}
                        </button>
                      )}
                      {!isComposing && !isEmail && (
                        <button onClick={() => copyMsg(key, msg)} style={{
                          padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                          background: wasCopied ? hexA("#4A8C6F", 0.12) : C.surfaceAlt,
                          color: wasCopied ? "#4A8C6F" : C.ink2, border: `1px solid ${wasCopied ? hexA("#4A8C6F", 0.35) : C.line}`,
                        }}>
                          {wasCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                        </button>
                      )}
                      {isComposing ? (
                        <button onClick={() => { setComposing(null); setExpanded(e => ({ ...e, [key]: false })); }} style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink2 }}>
                          Cancel
                        </button>
                      ) : (
                        <>
                          {!isEmail && (
                            <button onClick={() => markSent(item.seqId, item.stepId)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.surfaceAlt, color: C.ink2, border: `1px solid ${C.line}` }}>
                              Mark Sent ✓
                            </button>
                          )}
                          <button onClick={() => startCompose(key, item, msg)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.brand, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 5 }}>
                            <Send size={12} /> Send Email
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline email compose */}
                  {isComposing && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {/* Template picker */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <label style={{ fontSize: 11.5, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>Template</label>
                        <div style={{ position: "relative", flex: 1 }}>
                          <select
                            value={eState.selectedTemplateId || "__followup__"}
                            onChange={e => applyTemplate(key, e.target.value, item)}
                            style={{ width: "100%", padding: "6px 28px 6px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 12.5, color: C.ink, background: C.surfaceAlt, appearance: "none", cursor: "pointer", outline: "none" }}
                          >
                            <option value="__followup__">Follow-up sequence message ({item.stepDef?.label})</option>
                            {emailTemplates.length > 0 && (
                              <optgroup label="─── Template Library ───">
                                {emailTemplates.map(t => (
                                  <option key={t.id} value={t.id}>{t.name}{t.category ? ` · ${t.category}` : ""}</option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                          <ChevronDown size={13} color={C.ink3} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>
                        To: <strong style={{ color: C.ink2 }}>{item.client?.email || <span style={{ color: "#C0392B" }}>No email on file</span>}</strong>
                      </div>
                      <input
                        value={eState.subject || ""}
                        onChange={e => setEmailState(s => ({ ...s, [key]: { ...s[key], subject: e.target.value } }))}
                        placeholder="Subject"
                        style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, color: C.ink, background: C.surfaceAlt, outline: "none" }}
                      />
                      <textarea
                        value={eState.body || ""}
                        onChange={e => setEmailState(s => ({ ...s, [key]: { ...s[key], body: e.target.value } }))}
                        rows={8}
                        style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, color: C.ink, background: C.surfaceAlt, resize: "vertical", lineHeight: 1.7, fontFamily: "inherit", outline: "none" }}
                      />
                      {eState.error && <div style={{ fontSize: 12, color: "#C0392B" }}>{eState.error}</div>}
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => applyTemplate(key, eState.selectedTemplateId || "__followup__", item)}
                          style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink3 }}
                        >
                          Reset message
                        </button>
                        <button
                          onClick={() => sendFollowUpEmail(key, item)}
                          disabled={eState.sending || eState.sent || !item.client?.email}
                          style={{ padding: "6px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: eState.sending || eState.sent ? "not-allowed" : "pointer", background: eState.sent ? "#4A8C6F" : C.brand, color: "#fff", border: "none", display: "flex", alignItems: "center", gap: 6 }}
                        >
                          {eState.sent ? <><Check size={12} /> Sent!</>
                            : eState.sending ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending…</>
                            : <><Send size={12} /> Send Email</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* View-only message preview (non-email or before composing) */}
                  {isOpen && !isComposing && (
                    <div style={{
                      background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px",
                      fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap",
                      borderLeft: `3px solid ${item.stepDef?.accent || C.brand}`,
                    }}>
                      {msg}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const total = overdue.length + todayItems.length + upcoming.length;
  if (!total) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Zap size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Queue is clear</div>
        <div style={{ fontSize: 13 }}>Start a sequence from any client record after they attend a session.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {renderGroup(overdue,    "Overdue",    "#C0573F")}
      {renderGroup(todayItems, "Due Today",  "#D9892B")}
      {renderGroup(upcoming,   "Coming Up",  C.ink3)}
    </div>
  );
}

function SequencesView({ sequences, clients, today, onOpen, togglePause }) {
  if (!sequences.length) {
    return (
      <div style={{ textAlign: "center", padding: "48px 24px", color: C.ink3 }}>
        <Clock size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No sequences yet</div>
        <div style={{ fontSize: 13 }}>Open a client record and click "Start Follow-up Sequence" after they attend a session.</div>
      </div>
    );
  }

  const sorted = [...sequences].sort((a, b) => {
    const order = { active: 0, paused: 1, completed: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3) || b.sessionDate.localeCompare(a.sessionDate);
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {sorted.map(seq => {
        const client = clients.find(c => c.id === seq.clientId);
        const sentCount = seq.steps.filter(s => s.sent).length;
        const total = seq.steps.length;
        const pctDone = Math.round((sentCount / total) * 100);
        const nextPending = seq.steps.find(s => !s.sent);
        const nextDef = nextPending ? FU_STEPS.find(f => f.id === nextPending.stepId) : null;
        const isOverdue = nextPending && nextPending.dueDate < today;
        const statusColor = seq.status === "completed" ? "#4A8C6F" : seq.status === "paused" ? C.ink3 : C.brand;

        return (
          <div key={seq.id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>{(client?.name || "—").trim()}</div>
                <div style={{ fontSize: 12, color: C.ink3 }}>{seq.sessionName} · started {fmtDate(seq.sessionDate)}</div>
              </div>
              <Tag color={statusColor} soft>{seq.status}</Tag>
              {seq.status !== "completed" && (
                <button onClick={() => togglePause(seq.id)} style={{
                  padding: "4px 11px", fontSize: 12, borderRadius: 7, cursor: "pointer",
                  background: C.surfaceAlt, border: `1px solid ${C.line}`, color: C.ink2,
                }}>
                  {seq.status === "paused" ? "Resume" : "Pause"}
                </button>
              )}
            </div>
            {/* Progress bar */}
            <div style={{ height: 5, background: C.line, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ height: "100%", width: pctDone + "%", background: seq.status === "completed" ? "#4A8C6F" : C.brand, borderRadius: 6, transition: "width .3s" }} />
            </div>
            {/* Step chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {seq.steps.map(step => {
                const def = FU_STEPS.find(f => f.id === step.stepId);
                const late = !step.sent && step.dueDate < today;
                return (
                  <div key={step.stepId} style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 20,
                    background: step.sent ? hexA("#4A8C6F", 0.12) : late ? hexA("#C0573F", 0.12) : C.surfaceAlt,
                    color: step.sent ? "#4A8C6F" : late ? "#C0573F" : C.ink3,
                    border: `1px solid ${step.sent ? hexA("#4A8C6F", 0.3) : late ? hexA("#C0573F", 0.3) : C.line}`,
                  }}>
                    {step.sent ? "✓" : late ? "!" : "○"} {def?.label}
                    {step.sent && step.sentAt ? ` · ${fmtDate(step.sentAt)}` : ""}
                    {step.sent && step.notes ? ` — ${step.notes}` : ""}
                  </div>
                );
              })}
            </div>
            {nextDef && seq.status === "active" && (
              <div style={{ marginTop: 8, fontSize: 12, color: isOverdue ? "#C0573F" : C.ink3, fontWeight: isOverdue ? 600 : 400 }}>
                Next: {nextDef.label} — {isOverdue ? `overdue since ${fmtDate(nextPending.dueDate)}` : `scheduled ${fmtDate(nextPending.dueDate)}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── FU TEMPLATE EMAIL MODAL — recipient search + compose ── */
function FUTemplateEmailModal({ templateBody, templateName, data, setData, onClose }) {
  const [search, setSearch]     = useState("");
  const [recipient, setRecipient] = useState(null);
  const [subject, setSubject]   = useState(`Follow-up: ${templateName}`);
  const [body, setBody]         = useState("");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  const clients  = data.clients  || [];
  const partners = data.partners || [];
  const q = search.toLowerCase().trim();

  const populate = (recip) => {
    const full  = (recip?.name || "there").trim();
    const first = full.split(" ")[0];
    const contact = recip?._type === "partner" ? (recip.contact || full) : full;
    const rep = (s) => (s||"")
      .replace(/\{\{ClientName\}\}/gi, full).replace(/\{\{FirstName\}\}/gi, first)
      .replace(/\{first_name\}/g, contact.split(" ")[0]).replace(/\{name\}/g, contact)
      .replace(/\{\{ContactName\}\}/gi, contact).replace(/\{\{StudioName\}\}/gi, full)
      .replace(/\{\{Email\}\}/gi, recip?.email || "");
    return rep(templateBody);
  };

  const suggestions = q.length < 1 ? [] : [
    ...clients.filter(c => (c.name||"").toLowerCase().includes(q)).slice(0, 4).map(c => ({ ...c, _type: "client" })),
    ...partners.filter(p => (p.name||"").toLowerCase().includes(q) || (p.contact||"").toLowerCase().includes(q)).slice(0, 3).map(p => ({ ...p, _type: "partner" })),
  ];

  const selectRecipient = (r) => {
    setRecipient(r);
    setSearch(r._type === "partner" ? (r.contact || r.name) : cleanName(r.name));
    setBody(populate(r));
  };

  const recipientEmail = recipient?._type === "partner" ? recipient.email : recipient?.email;

  const send = async () => {
    if (!recipientEmail) return;
    setSending(true); setError("");
    try {
      const secret = import.meta.env.VITE_FRONTEND_SECRET || "";
      const res = await fetch("/api/send-email", {
        method: "POST", headers: { "Content-Type": "application/json", "x-frontend-secret": secret },
        body: JSON.stringify({ to: recipientEmail, recipientName: recipient?._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient?.name || ""), subject, body }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Send failed.");
      const logEntry = { id: `em_${Date.now()}`, date: new Date().toISOString(), templateId: "fu_custom", templateName, category: "Follow-Up", to: recipientEmail, recipientName: recipient?._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient?.name || ""), recipientType: recipient?._type, subject, body, resendId: json.id || null, sendStatus: "sent" };
      setData(d => ({
        ...d,
        emailLog: [...(d.emailLog || []), logEntry],
        clients:  recipient?._type === "client"  ? (d.clients  || []).map(c => c.id === recipient.id ? { ...c, emailHistory: [...(c.emailHistory||[]), logEntry] } : c) : (d.clients  || []),
        partners: recipient?._type === "partner" ? (d.partners || []).map(p => p.id === recipient.id ? { ...p, lastTouch: new Date().toISOString().slice(0,10), emailHistory: [...(p.emailHistory||[]), logEntry] } : p) : (d.partners || []),
      }));
      setSent(true);
      setTimeout(() => { setSent(false); onClose(); }, 1500);
    } catch (err) { setError(err.message); }
    setSending(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: C.surface, borderRadius: 14, padding: 24, width: "min(560px,95vw)", display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 24px 80px rgba(0,0,0,.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}><Send size={14} style={{ marginRight: 6 }} />{templateName}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3 }}><X size={16} /></button>
        </div>

        {/* Recipient search */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 }}>Send To</div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => { setSearch(e.target.value); setRecipient(null); }} placeholder="Search client or studio contact…"
              style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, outline: "none" }} />
            {suggestions.length > 0 && !recipient && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: "0 8px 24px rgba(0,0,0,.1)" }}>
                {suggestions.map(r => (
                  <div key={r.id} onClick={() => selectRecipient(r)}
                    style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid ${C.line}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceAlt}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: r._type === "partner" ? hexA("#D9892B", 0.15) : hexA(C.brand, 0.12), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {r._type === "partner" ? <Building2 size={14} color="#D9892B" /> : <Users size={14} color={C.brand} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{r._type === "partner" ? (r.contact || r.name) : cleanName(r.name)}</div>
                      <div style={{ fontSize: 11.5, color: C.ink3 }}>{r._type === "partner" ? `Studio · ${r.name}` : r.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {recipient && (
            <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, background: recipient._type === "partner" ? hexA("#D9892B", 0.1) : hexA(C.brand, 0.1), border: `1px solid ${recipient._type === "partner" ? "#F6D9A8" : hexA(C.brand, 0.3)}`, borderRadius: 20, padding: "4px 10px 4px 8px" }}>
              {recipient._type === "partner" ? <Building2 size={11} color="#D9892B" /> : <Users size={11} color={C.brand} />}
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>{recipient._type === "partner" ? (recipient.contact || recipient.name) : cleanName(recipient.name)}</span>
              <button onClick={() => { setRecipient(null); setSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink3, padding: 0, display: "flex" }}><X size={12} /></button>
            </div>
          )}
        </div>

        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject"
          style={{ padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={9} placeholder={recipient ? "" : "Select a recipient to auto-populate…"}
          style={{ padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, resize: "vertical", lineHeight: 1.75, fontFamily: "inherit", outline: "none" }} />
        {error && <div style={{ fontSize: 12, color: "#C0392B" }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Close</button>
          <button onClick={send} disabled={sending || sent || !recipientEmail}
            style={{ padding: "7px 20px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, background: sent ? "#4A8C6F" : C.brand, color: "#fff", cursor: sending || sent || !recipientEmail ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, opacity: !recipientEmail ? 0.5 : 1 }}>
            {sent ? <><Check size={13}/> Sent!</> : sending ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }}/> Sending…</> : <><Send size={13}/> Send Email</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesView({ data, setData }) {
  const [copied, setCopied]     = useState(null);
  const [editing, setEditing]   = useState(null);   // id of card being edited
  const [editText, setEditText] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newTmpl, setNewTmpl]   = useState({ name: "", channel: "email", body: "" });
  const [emailModal, setEmailModal] = useState(null); // { id, body, name }

  // Overrides / custom templates stored in data.fuTemplates
  const fuOverrides = data.fuTemplates || [];
  const getBody = (stepId) => fuOverrides.find(t => t.id === stepId)?.body ?? FU_TEMPLATES[stepId] ?? "";
  const customTmpls = fuOverrides.filter(t => t.isCustom);

  const saveEdit = (id) => {
    setData(d => {
      const existing = (d.fuTemplates || []).find(t => t.id === id);
      if (existing) return { ...d, fuTemplates: (d.fuTemplates).map(t => t.id === id ? { ...t, body: editText } : t) };
      return { ...d, fuTemplates: [...(d.fuTemplates || []), { id, body: editText }] };
    });
    setEditing(null);
  };

  const resetToDefault = (id) => {
    setData(d => ({ ...d, fuTemplates: (d.fuTemplates || []).filter(t => t.id !== id) }));
    setEditing(null);
  };

  const saveNew = () => {
    if (!newTmpl.name.trim() || !newTmpl.body.trim()) return;
    setData(d => ({
      ...d,
      fuTemplates: [...(d.fuTemplates || []), {
        id: `fuc_${Date.now()}`, name: newTmpl.name.trim(),
        channel: newTmpl.channel, body: newTmpl.body.trim(), isCustom: true,
        accent: "#6B5CE7",
      }],
    }));
    setNewTmpl({ name: "", channel: "email", body: "" });
    setAddingNew(false);
  };

  const deleteCustom = (id) => {
    setData(d => ({ ...d, fuTemplates: (d.fuTemplates || []).filter(t => t.id !== id) }));
  };

  const copyTpl = (id, body) => {
    try { navigator.clipboard.writeText(body); } catch (e) {}
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const btnStyle = (active, color) => ({
    padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
    background: active ? hexA(color, 0.12) : C.surfaceAlt,
    color: active ? color : C.ink2, border: `1px solid ${active ? hexA(color, 0.35) : C.line}`,
  });

  const renderCard = (id, label, channel, accent, delayDays, body, isCustom = false) => {
    const isEdit = editing === id;
    const isCopied = copied === id;
    return (
      <div key={id} style={{ background: C.surface, border: `1px solid ${C.line}`, borderLeft: `4px solid ${accent}`, borderRadius: 10, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <Tag color={accent} soft>{label}</Tag>
            <MiniChip color={accent}>{channel === "email" ? "Email" : "Text"}</MiniChip>
            {delayDays !== undefined && (
              <span style={{ fontSize: 12, color: C.ink3, flex: 1 }}>
                {delayDays === 0 ? "Send same day as session" : `Send ~${delayDays} days after session`}
              </span>
            )}
            <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap" }}>
              {!isEdit && (
                <>
                  <button onClick={() => copyTpl(id, body)} style={btnStyle(isCopied, "#4A8C6F")}>
                    {isCopied ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy</>}
                  </button>
                  <button onClick={() => { setEditing(id); setEditText(body); }} style={btnStyle(false, C.brand)}>
                    Edit
                  </button>
                  <button
                    onClick={() => setEmailModal({ id, body, name: label })}
                    style={{ padding: "5px 11px", borderRadius: 7, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, background: C.brand, color: "#fff", border: "none", fontWeight: 600 }}
                  >
                    <Send size={12} /> Email
                  </button>
                  {isCustom && (
                    <button onClick={() => deleteCustom(id)} style={{ padding: "5px 8px", borderRadius: 7, fontSize: 12, cursor: "pointer", background: hexA("#C0392B", 0.07), color: "#C0392B", border: `1px solid ${hexA("#C0392B", 0.2)}` }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
              {isEdit && (
                <>
                  <button onClick={() => saveEdit(id)} style={{ padding: "5px 14px", borderRadius: 7, fontSize: 12, cursor: "pointer", fontWeight: 600, background: C.brand, color: "#fff", border: "none" }}>Save</button>
                  {!isCustom && <button onClick={() => resetToDefault(id)} style={btnStyle(false, C.ink3)}>Reset default</button>}
                  <button onClick={() => setEditing(null)} style={btnStyle(false, C.ink2)}>Cancel</button>
                </>
              )}
            </div>
          </div>
          {isEdit ? (
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={8}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.brand}`, borderRadius: 8, fontSize: 13, lineHeight: 1.75, fontFamily: "inherit", resize: "vertical", outline: "none", color: C.ink }} />
          ) : (
            <div style={{ background: C.surfaceAlt, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: C.ink, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
              {body}
              {!isCustom && fuOverrides.find(t => t.id === id) && (
                <div style={{ marginTop: 8, fontSize: 11, color: C.brand, fontWeight: 600 }}>✎ Custom edit</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 13, color: C.ink3 }}>
          Templates are auto-personalized with the client's name. Edit any template or add custom messages.
        </div>
        <button onClick={() => setAddingNew(true)} style={{ padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600, background: C.brand, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={13} /> Add Template
        </button>
      </div>

      {/* Sequence templates */}
      {FU_STEPS.map(step => renderCard(step.id, step.label, step.channel, step.accent, step.delayDays, getBody(step.id), false))}

      {/* Custom templates */}
      {customTmpls.map(t => renderCard(t.id, t.name, t.channel, t.accent || "#6B5CE7", undefined, t.body, true))}

      {/* Add new template form */}
      {addingNew && (
        <div style={{ background: C.surface, border: `2px solid ${C.brand}`, borderRadius: 10, padding: "16px" }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>New Template</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <input value={newTmpl.name} onChange={e => setNewTmpl(n => ({ ...n, name: e.target.value }))} placeholder="Template name"
              style={{ flex: 2, minWidth: 160, padding: "7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, outline: "none" }} />
            <div style={{ position: "relative" }}>
              <select value={newTmpl.channel} onChange={e => setNewTmpl(n => ({ ...n, channel: e.target.value }))}
                style={{ padding: "7px 28px 7px 10px", border: `1px solid ${C.line}`, borderRadius: 7, fontSize: 13, appearance: "none", outline: "none", background: C.surfaceAlt }}>
                <option value="email">Email</option>
                <option value="text">Text</option>
              </select>
              <ChevronDown size={12} color={C.ink3} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            </div>
          </div>
          <textarea value={newTmpl.body} onChange={e => setNewTmpl(n => ({ ...n, body: e.target.value }))} rows={6} placeholder="Write your template… use {first_name} for auto-fill"
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${C.line}`, borderRadius: 8, fontSize: 13, lineHeight: 1.75, fontFamily: "inherit", resize: "vertical", outline: "none" }} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
            <button onClick={() => setAddingNew(false)} style={{ padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.line}`, background: "transparent", fontSize: 13, fontWeight: 600, color: C.ink2, cursor: "pointer" }}>Cancel</button>
            <button onClick={saveNew} disabled={!newTmpl.name.trim() || !newTmpl.body.trim()}
              style={{ padding: "6px 18px", borderRadius: 7, border: "none", fontSize: 13, fontWeight: 700, background: C.brand, color: "#fff", cursor: "pointer", opacity: (!newTmpl.name.trim() || !newTmpl.body.trim()) ? 0.5 : 1 }}>
              Save Template
            </button>
          </div>
        </div>
      )}

      {/* Email compose modal with recipient search */}
      {emailModal && (
        <FUTemplateEmailModal
          templateBody={emailModal.body}
          templateName={emailModal.name}
          data={data} setData={setData}
          onClose={() => setEmailModal(null)}
        />
      )}
    </div>
  );
}

const FONT = {
  display: "'Iowan Old Style','Palatino Linotype','Palatino','Georgia',serif",
  body: "-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',system-ui,sans-serif",
};

/* ============================================================
   CSS
   ============================================================ */
const CSS = `
* { box-sizing: border-box; }
input, textarea, select, button { font-family: inherit; }
.lucide { stroke-width: 1.5 !important; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.sb-shell { display: flex; min-height: 100vh; }
.sb-sidebar { width: 226px; flex-shrink: 0; background: ${C.surface}; border-right: 1px solid ${C.line}; display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; z-index: 40; }
.sb-navbtn { display: flex; align-items: center; gap: 11px; width: 100%; padding: 9px 12px; border: none; border-radius: 9px; font-size: 14px; cursor: pointer; transition: background .12s; }
.sb-navbtn:hover { background: ${C.brandMist}; }
.sb-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.sb-header { display: flex; align-items: center; gap: 12px; padding: 16px 28px; border-bottom: 1px solid ${C.line}; background: ${hexA(C.bg, 0.85)}; backdrop-filter: blur(8px); position: sticky; top: 0; z-index: 20; }
.sb-content { padding: 22px 28px 28px; max-width: 1280px; width: 100%; }
.sb-menu { display: none; background: none; border: none; cursor: pointer; color: ${C.ink}; padding: 4px; }
.sb-scrim { display: none; }
.sb-search { display: flex; align-items: center; gap: 7px; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 9px; padding: 7px 11px; width: 220px; }
.sb-search input { border: none; outline: none; background: none; font-size: 13.5px; width: 100%; color: ${C.ink}; }
.sb-card { background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 14px; }
.sb-primary { display: inline-flex; align-items: center; gap: 6px; background: ${C.brand}; color: #fff; border: none; border-radius: 9px; padding: 8px 14px; font-size: 13.5px; font-weight: 600; cursor: pointer; transition: background .12s; }
.sb-primary:hover { background: ${C.brandDeep}; }
.sb-ghost { display: inline-flex; align-items: center; gap: 6px; background: ${C.surface}; color: ${C.ink2}; border: 1px solid ${C.line}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-ghost:hover { background: ${C.surfaceAlt}; }
.sb-danger { display: inline-flex; align-items: center; gap: 6px; background: none; color: #B4513B; border: 1px solid ${hexA("#B4513B", 0.3)}; border-radius: 9px; padding: 8px 12px; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-danger:hover { background: ${hexA("#B4513B", 0.07)}; }
.sb-link { display: inline-flex; align-items: center; gap: 2px; background: none; border: none; color: ${C.brand}; font-size: 13px; font-weight: 600; cursor: pointer; }
.sb-iconbtn { width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 8px; cursor: pointer; color: ${C.ink2}; }
.sb-iconbtn:hover { background: ${C.surfaceAlt}; }

.sb-hero { display: flex; align-items: center; gap: 20px; background: linear-gradient(120deg, ${C.brandMist}, ${C.surface}); border: 1px solid ${C.line}; border-radius: 16px; padding: 22px 26px; }
.sb-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.sb-stat { padding: 16px 18px; }
.sb-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.sb-panelhead { display: flex; align-items: center; gap: 9px; padding: 15px 18px 10px; }
.sb-panelbody { padding: 0 8px 8px; }
.sb-badge { background: ${C.brandSoft}; color: ${C.brandDeep}; font-size: 12px; font-weight: 700; padding: 1px 9px; border-radius: 20px; }
.sb-listrow { display: flex; align-items: center; gap: 11px; width: 100%; padding: 10px 12px; border: none; background: none; border-radius: 10px; cursor: pointer; text-align: left; }
.sb-listrow:hover { background: ${C.surfaceAlt}; }
.sb-nba-row:hover { background: ${C.surfaceAlt}; }
.sb-actionrow { align-items: flex-start; padding: 12px 14px; border-bottom: 1px solid ${C.lineSoft}; border-radius: 0; }
.sb-actionrow:last-child { border-bottom: none; }
.sb-actionrow:hover { background: ${C.brandMist}; }
.sb-rowtitle { font-size: 13.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowsub { font-size: 12px; color: ${C.ink3}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-rowval { font-size: 13px; font-weight: 600; color: ${C.brand}; white-space: nowrap; }
.sb-mininote { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: ${C.ink3}; padding: 8px 12px 2px; }

.sb-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
.sb-tab { background: none; border: none; padding: 7px 13px; border-radius: 8px; font-size: 13.5px; font-weight: 600; color: ${C.ink3}; cursor: pointer; }
.sb-tab:hover { color: ${C.ink2}; background: ${C.surfaceAlt}; }
.sb-tab-on { color: ${C.brandDeep}; background: ${C.brandSoft}; }

.sb-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.sb-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid ${C.line}; white-space: nowrap; }
.sb-table td { padding: 13px 16px; border-bottom: 1px solid ${C.lineSoft}; color: ${C.ink}; white-space: nowrap; }
.sb-trow { cursor: pointer; }
.sb-trow:hover td { background: ${C.surfaceAlt}; }
.sb-table tbody tr:last-child td { border-bottom: none; }
.sb-table tfoot td { padding: 12px 16px; border-top: 2px solid ${C.line}; background: ${C.surfaceAlt}; font-size: 13.5px; }

.sb-board { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 12px; }
.sb-col { min-width: 224px; width: 224px; flex-shrink: 0; }
.sb-colhead { display: flex; align-items: center; justify-content: space-between; padding: 4px 4px 10px; }
.sb-bcard { display: block; width: 100%; text-align: left; background: ${C.surface}; border: 1px solid ${C.line}; border-radius: 11px; padding: 11px 12px; cursor: pointer; transition: box-shadow .12s, transform .12s; }
.sb-bcard:hover { box-shadow: 0 4px 16px ${hexA(C.brandDeep, 0.1)}; transform: translateY(-1px); }
.sb-emptycard { border: 1px dashed ${C.line}; border-radius: 11px; padding: 14px; text-align: center; color: ${C.ink3}; font-size: 13px; }

.sb-cal { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.sb-caldow { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; text-align: center; padding-bottom: 4px; font-weight: 600; }
.sb-calcell { border-radius: 9px; padding: 6px; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
.sb-calev { font-size: 10.5px; font-weight: 600; background: ${C.brandSoft}; color: ${C.brandDeep}; border: none; border-radius: 5px; padding: 3px 5px; cursor: pointer; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sb-calev:hover { background: ${C.brand}; color: #fff; }

.sb-drawerwrap { position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.38)}; display: flex; align-items: center; justify-content: center; z-index: 60; backdrop-filter: blur(4px); padding: 20px; }
.sb-drawer { width: 700px; max-width: 96vw; max-height: 90vh; background: ${C.surface}; border-radius: 20px; display: flex; flex-direction: column; box-shadow: 0 24px 80px ${hexA(C.brandDeep, 0.32)}, 0 4px 20px ${hexA(C.brandDeep, 0.12)}; animation: sb-pop .22s cubic-bezier(.22,.68,0,1.2); overflow: hidden; }
.sb-drawer-wide { width: 900px; }
.sb-modal { width: 540px; max-width: 94vw; max-height: 88vh; margin: auto; background: ${C.surface}; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 60px ${hexA(C.brandDeep, 0.3)}; animation: sb-pop .2s ease; }
.sb-drawerwrap:has(.sb-modal) { align-items: center; justify-content: center; }
@keyframes sb-slide { from { transform: translateX(30px); opacity: .6; } to { transform: none; opacity: 1; } }
@keyframes sb-pop { from { transform: scale(.96) translateY(6px); opacity: 0; } to { transform: none; opacity: 1; } }
.sb-drawerhead { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 16px; border-bottom: 1px solid ${C.line}; flex-shrink: 0; }
.sb-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: .12em; color: ${C.ink3}; font-weight: 600; }
.sb-drawerbody { padding: 20px 22px; overflow-y: auto; flex: 1; }
.sb-drawerfoot { display: flex; align-items: center; gap: 9px; padding: 14px 22px; border-top: 1px solid ${C.line}; flex-shrink: 0; }
.sb-titleinput { font-family: ${FONT.display}; font-size: 22px; font-weight: 600; border: none; outline: none; width: 100%; color: ${C.ink}; padding: 0 0 14px; }
.sb-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.sb-field { display: flex; flex-direction: column; gap: 5px; }
.sb-field-wide { grid-column: 1 / -1; }
.sb-flabel { font-size: 11.5px; text-transform: uppercase; letter-spacing: .05em; color: ${C.ink3}; font-weight: 600; }
.sb-input { border: 1px solid ${C.line}; border-radius: 8px; padding: 8px 11px; font-size: 13.5px; outline: none; color: ${C.ink}; background: ${C.surface}; width: 100%; }
.sb-input:focus { border-color: ${C.brand}; box-shadow: 0 0 0 3px ${hexA(C.brand, 0.12)}; }
.sb-affix { position: absolute; top: 50%; transform: translateY(-50%); font-size: 12px; color: ${C.ink3}; }
.sb-chiprow { display: flex; flex-wrap: wrap; gap: 6px; }
.sb-selchip { border: 1px solid ${C.line}; border-radius: 20px; padding: 5px 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; transition: all .1s; }
.sb-rellabel { display: flex; align-items: center; gap: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: ${C.ink3}; font-weight: 700; padding-bottom: 7px; border-bottom: 1px solid ${C.lineSoft}; margin-bottom: 6px; }
.sb-relrow { display: flex; align-items: center; gap: 9px; width: 100%; background: none; border: none; padding: 8px 6px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.sb-relrow:hover { background: ${C.surfaceAlt}; }
.sb-importrow { display: flex; align-items: center; gap: 12px; padding: 11px 13px; border: 1px solid ${C.line}; border-radius: 11px; }
.sb-importok { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 600; color: ${C.brand}; }

.sb-breathe { animation: sb-breath 8s ease-in-out infinite; }
.sb-breathe2 { animation-delay: .4s; }
@keyframes sb-breath { 0%,100% { transform: scale(.82); opacity: .25; } 45% { transform: scale(1.12); opacity: .55; } }
@media (prefers-reduced-motion: reduce) { .sb-breathe { animation: none; } }

::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 6px; border: 2px solid ${C.bg}; }
:focus-visible { outline: 2px solid ${C.brand}; outline-offset: 2px; }

@media (max-width: 860px) {
  .sb-sidebar { position: fixed; left: 0; top: 0; transform: translateX(-100%); transition: transform .22s; box-shadow: 4px 0 30px ${hexA(C.brandDeep, 0.2)}; }
  .sb-sidebar.sb-open { transform: none; }
  .sb-scrim { display: block; position: fixed; inset: 0; background: ${hexA(C.brandDeep, 0.3)}; z-index: 35; }
  .sb-menu { display: inline-flex; }
  .sb-stats { grid-template-columns: 1fr 1fr; }
  .sb-nba-grid { grid-template-columns: 1fr !important; }
  .sb-pipeline-grid { grid-template-columns: 1fr 1fr !important; }
  .sb-lane-split { flex-direction: column !important; }
  .sb-grid2 { grid-template-columns: 1fr; }
  .sb-content, .sb-header { padding-left: 16px; padding-right: 16px; }
  .sb-search { width: 130px; }
  .sb-fields { grid-template-columns: 1fr; }
  .sb-hero { flex-direction: column; text-align: center; }
}
`;


